import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { z } from "zod"
import { endOfDay, getDay, startOfDay } from "date-fns"

const appointmentSchema = z.object({
  date: z.string(),
  time: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  service: z.string().min(1),
  notes: z.string().optional(),
  doctorId: z.string().uuid().optional().nullable(),
})

// GET: Get all appointments with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await setCurrentUserIdForRLS(session.user.id)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")
    const doctorId = searchParams.get("doctorId")

    // By default, hide cancelled appointments in admin views
    const where: any = {
      status: {
        not: "CANCELLED",
      },
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    if (status) {
      // Allow explicit status filter to override the default
      where.status = status
    }

    if (doctorId && doctorId !== "ALL") {
      where.doctorId = doctorId
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { date: "asc" },
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
            email: true,
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

// POST: Create appointment (guest or linked to user)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await setCurrentUserIdForRLS(session.user.id)

    const body = await request.json()
    const validatedData = appointmentSchema.parse(body)

    // Combine date and time
    const appointmentDate = new Date(validatedData.date)
    const [hours, minutes] = validatedData.time.split(":").map(Number)
    appointmentDate.setHours(hours, minutes, 0, 0)

    // Resolve doctor assignment:
    // - If admin selected a doctor, use that (and ensure no double-booking).
    // - Otherwise, auto-assign using a simple round-robin based on daily load and availability.
    let doctorIdToUse: string | null = validatedData.doctorId ?? null

    if (!doctorIdToUse) {
      const dayOfWeek = getDay(appointmentDate)
      const allDoctors = await prisma.user.findMany({
        where: { role: "DOCTOR" },
        select: { id: true },
      })

      if (allDoctors.length > 0) {
        const doctorIds = allDoctors.map((d: { id: string }) => d.id)

        // Doctors who are actively available on this weekday AND within the time window
        const availabilities = await prisma.availability.findMany({
          where: {
            dayOfWeek,
            isActive: true,
            doctorId: { in: doctorIds },
          },
        })

        const minutesSinceMidnight = hours * 60 + minutes

        type AvailRow = { startTime: string; endTime: string; doctorId: string | null }
        const availableDoctorIds = (availabilities as AvailRow[])
          .filter((a: AvailRow) => {
            const [sh, sm] = a.startTime.split(":").map(Number)
            const [eh, em] = a.endTime.split(":").map(Number)
            const startMinutes = sh * 60 + sm
            const endMinutes = eh * 60 + em
            return minutesSinceMidnight >= startMinutes && minutesSinceMidnight < endMinutes
          })
          .map((a: AvailRow) => a.doctorId!)

        if (availableDoctorIds.length > 0) {
          // Count how many appointments each available doctor already has today
          const dayStart = startOfDay(appointmentDate)
          const dayEnd = endOfDay(appointmentDate)

          const todaysAppointments = await prisma.appointment.findMany({
            where: {
              doctorId: { in: availableDoctorIds },
              date: {
                gte: dayStart,
                lte: dayEnd,
              },
              status: {
                notIn: ["CANCELLED"],
              },
            },
            select: {
              doctorId: true,
            },
          })

          const counts = new Map<string, number>()
          availableDoctorIds.forEach((id: string) => counts.set(id, 0))
          todaysAppointments.forEach((apt: { doctorId: string | null }) => {
            if (apt.doctorId) {
              counts.set(apt.doctorId, (counts.get(apt.doctorId) ?? 0) + 1)
            }
          })

          // Pick doctor with fewest appointments today (simple round-robin / fair distribution)
          let chosenDoctorId: string | null = null
          let minCount = Number.POSITIVE_INFINITY
          for (const id of availableDoctorIds) {
            const c = counts.get(id) ?? 0
            if (c < minCount) {
              minCount = c
              chosenDoctorId = id
            }
          }

          doctorIdToUse = chosenDoctorId
        }
      }
    }

    if (doctorIdToUse) {
      const slotTaken = await prisma.appointment.findFirst({
        where: {
          date: appointmentDate,
          status: {
            notIn: ["CANCELLED"],
          },
          doctorId: doctorIdToUse,
        },
      })

      if (slotTaken) {
        return NextResponse.json(
          { error: "This doctor already has an appointment at that time." },
          { status: 400 }
        )
      }
    }

    // Try to find existing user, otherwise create guest appointment.
    let user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // Enforce at most one active upcoming appointment per patient (email or linked user),
    // consistent with the public booking API. Admins can still override by editing or
    // cancelling existing bookings first.
    const activeFrom = startOfDay(new Date())
    const patientConditions: any[] = []
    if (user?.id) {
      patientConditions.push({ patientId: user.id })
    }
    patientConditions.push({ patientEmail: validatedData.email })

    const existingForPatient = await prisma.appointment.findFirst({
      where: {
        OR: patientConditions,
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
        date: {
          gte: activeFrom,
        },
      },
    })

    if (existingForPatient) {
      return NextResponse.json(
        {
          error:
            "This patient already has an active upcoming appointment. Please cancel or complete the existing booking before creating a new one.",
        },
        { status: 400 }
      )
    }

    const appointmentData: any = {
      service: validatedData.service,
      date: appointmentDate,
      status: "CONFIRMED",
      ...(validatedData.notes ? { notes: validatedData.notes } : {}),
      createdBy:
        session.user?.email?.split("@")[0] ||
        session.user?.name ||
        "ADMIN",
      paymentStatus: "PENDING",
      // treatmentStatus omitted here to stay compatible with current Prisma schema/client
    }

    if (doctorIdToUse) {
      appointmentData.doctor = {
        connect: { id: doctorIdToUse },
      }
    }

    if (user) {
      // Link to existing user via relation
      appointmentData.patient = {
        connect: { id: user.id },
      }
    } else {
      // Guest appointment
      appointmentData.patientName = validatedData.name
      appointmentData.patientEmail = validatedData.email
      appointmentData.patientPhone = validatedData.phone
    }

    const appointment = await prisma.appointment.create({
      data: appointmentData,
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
            email: true,
          },
        },
      },
    })

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
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    )
  }
}

