import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { startOfDay, endOfDay } from "date-fns"
import { sendAppointmentConfirmedEmail } from "@/lib/email"

const appointmentSchema = z.object({
  service: z.string(),
  date: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  notes: z.string().optional(),
  doctorId: z.string().optional(), // "ANY" or specific doctor id
})

/**
 * Find an available doctor for the exact time slot.
 * - If a specific doctor is requested, ensure that doctor is free at that time.
 * - If "ANY" (or no doctor specified), pick any doctor who is free at that time.
 * Returns the chosen doctor's id, or null if no suitable doctor is available.
 */
async function pickDoctorForSlot(
  appointmentDate: Date,
  requestedDoctorId?: string | null | "ANY"
): Promise<string | null> {
  // Load candidate doctors
  const doctorWhere: any = { role: "DOCTOR" }
  if (requestedDoctorId && requestedDoctorId !== "ANY") {
    doctorWhere.id = requestedDoctorId
  }

  const doctors = await prisma.user.findMany({
    where: doctorWhere,
    select: { id: true },
  })

  if (doctors.length === 0) {
    return null
  }

  const doctorIdSet = new Set(doctors.map((d: { id: string }) => d.id))

  // Find doctors already booked at this exact time
  const appointmentsAtTime = await prisma.appointment.findMany({
    where: {
      date: appointmentDate,
      status: {
        notIn: ["CANCELLED"],
      },
    },
    select: {
      doctor: {
        select: { id: true },
      },
    },
  })

  const busyDoctorIds = new Set<string>()
  for (const apt of appointmentsAtTime) {
    const id = apt.doctor?.id
    if (id && doctorIdSet.has(id)) {
      busyDoctorIds.add(id)
    }
  }

  // If a specific doctor was requested, ensure they're free
  if (requestedDoctorId && requestedDoctorId !== "ANY") {
    return busyDoctorIds.has(requestedDoctorId) ? null : requestedDoctorId
  }

  // Otherwise, pick any free doctor
  for (const d of doctors) {
    if (!busyDoctorIds.has(d.id)) {
      return d.id
    }
  }

  // All candidate doctors are busy at this time
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = appointmentSchema.parse(body)

    // Check if user exists, if not create one
    let user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      // For guest bookings, create a user without password
      // In production, you might want to handle this differently
      user = await prisma.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          phone: validatedData.phone,
          password: "", // Guest users don't have passwords
          role: "PATIENT",
        },
      })
    }

    // Check if user already has an active upcoming appointment.
    // We consider both linked user id and legacy guest bookings that only stored email.
    const activeFrom = startOfDay(new Date())
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { patientId: user.id },
          { patientEmail: validatedData.email },
        ],
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
        date: {
          gte: activeFrom,
        },
      },
    })

    if (existingAppointment) {
      return NextResponse.json(
        {
          error:
            "You already have an active appointment. Please cancel it first from Dash Board before booking a new one.",
        },
        { status: 400 }
      )
    }

    const appointmentDate = new Date(validatedData.date)
    appointmentDate.setSeconds(0, 0)

    // Determine doctor assignment for this exact slot
    const requestedDoctorId = (validatedData as any).doctorId as
      | string
      | "ANY"
      | undefined
    const chosenDoctorId = await pickDoctorForSlot(appointmentDate, requestedDoctorId)

    if (!chosenDoctorId) {
      return NextResponse.json(
        {
          error:
            "No dentist is available at this time slot. Please choose another time.",
        },
        { status: 400 }
      )
    }

    // Create appointment - link patient via relation instead of scalar patientId
    const appointment = await prisma.appointment.create({
      data: {
        service: validatedData.service,
        date: appointmentDate,
        ...(validatedData.notes ? { notes: validatedData.notes } : {}),
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        createdBy: "USER",
        // Link to the chosen doctor through the relation rather than doctorId scalar
        doctor: {
          connect: { id: chosenDoctorId },
        },
        patient: {
          connect: { id: user.id },
        },
      },
      include: {
        doctor: { select: { name: true } },
        patient: { select: { name: true, email: true, phone: true } },
      },
    })

    // Fire-and-forget: send appointment confirmation email (don’t block booking UX).
    const patientEmail = appointment.patient?.email || validatedData.email
    if (patientEmail) {
      sendAppointmentConfirmedEmail({
        toEmail: patientEmail,
        patientName: appointment.patient?.name || validatedData.name,
        patientPhone: appointment.patient?.phone || validatedData.phone,
        service: appointment.service,
        appointmentDate: appointment.date,
        doctorName: appointment.doctor?.name || null,
        notes: appointment.notes || null,
      }).catch((e) => {
        console.error("Failed to send appointment confirmation email:", e)
      })
    }

    return NextResponse.json(
      { success: true, appointment },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating appointment:", error)

    // Provide more detailed error message, but strip ANSI color codes for readability
    const rawMessage =
      error instanceof Error ? error.message : "Failed to create appointment"
    const errorMessage =
      typeof rawMessage === "string"
        ? rawMessage.replace(/\x1b\[[0-9;]*m/g, "")
        : "Failed to create appointment"

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (userId) {
      const appointments = await prisma.appointment.findMany({
        where: { patientId: userId },
        orderBy: { date: "asc" },
        include: {
          patient: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      })
      return NextResponse.json({ appointments })
    }

    // Admin: get all appointments
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: "asc" },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}

