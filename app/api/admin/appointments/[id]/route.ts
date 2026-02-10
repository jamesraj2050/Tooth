import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendAppointmentConfirmedEmail } from "@/lib/email"

const updateAppointmentSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  service: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  adminConfirmed: z.boolean().optional(),
})

// PATCH: Update appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateAppointmentSchema.parse(body)

    const prev = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: {
        adminConfirmed: true,
        date: true,
        service: true,
        notes: true,
        patientName: true,
        patientEmail: true,
        patientPhone: true,
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!prev) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const updateData: any = {}

    if (validatedData.service) {
      updateData.service = validatedData.service
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    if (validatedData.status) {
      updateData.status = validatedData.status
    }

    // Handle date/time update
    if (validatedData.date && validatedData.time) {
      const appointmentDate = new Date(validatedData.date)
      const [hours, minutes] = validatedData.time.split(":").map(Number)
      appointmentDate.setHours(hours, minutes, 0, 0)
      updateData.date = appointmentDate
    }

    // Handle guest appointment fields
    if (validatedData.name) {
      updateData.patientName = validatedData.name
    }
    if (validatedData.email) {
      updateData.patientEmail = validatedData.email
    }
    if (validatedData.phone) {
      updateData.patientPhone = validatedData.phone
    }

  if (validatedData.adminConfirmed !== undefined) {
    updateData.adminConfirmed = validatedData.adminConfirmed
  }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
    })

    const flippedToConfirmed =
      validatedData.adminConfirmed === true && prev.adminConfirmed === false

    if (flippedToConfirmed) {
      const patientEmail = appointment.patient?.email || appointment.patientEmail || ""
      const patientName =
        appointment.patient?.name || appointment.patientName || "Patient"
      const patientPhone = appointment.patient?.phone || appointment.patientPhone || null

      // Fire-and-forget (don’t block admin UI on email issues)
      if (patientEmail) {
        sendAppointmentConfirmedEmail({
          toEmail: patientEmail,
          patientName,
          patientPhone,
          service: appointment.service,
          appointmentDate: appointment.date,
          doctorName: appointment.doctor?.name || null,
          notes: appointment.notes || null,
        }).catch((e) => {
          console.error("Failed to send appointment confirmation email:", e)
        })
      }
    }

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating appointment:", error)
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    )
  }
}

// DELETE: Cancel/delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    )
  }
}

