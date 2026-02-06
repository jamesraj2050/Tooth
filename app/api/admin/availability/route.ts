import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { z } from "zod"

const upsertSchema = z.object({
  doctorId: z.string(),
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        isActive: z.boolean(),
      })
    )
    .min(1),
})

// GET: list availability rows for a given doctor (and optionally include global defaults)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await setCurrentUserIdForRLS(session.user.id)

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctorId")

    if (!doctorId) {
      return NextResponse.json(
        { error: "doctorId query parameter is required" },
        { status: 400 }
      )
    }

    const [doctorSpecific, globalDefaults] = await Promise.all([
      prisma.availability.findMany({
        where: {
          doctor: {
            is: { id: doctorId },
          },
        },
        orderBy: { dayOfWeek: "asc" },
      }),
      prisma.availability.findMany({
        where: {
          doctorId: null,
        },
        orderBy: { dayOfWeek: "asc" },
      }),
    ])

    return NextResponse.json({
      doctorAvailability: doctorSpecific,
      globalDefaults,
    })
  } catch (error) {
    console.error("Error fetching doctor availability:", error)
    return NextResponse.json(
      { error: "Failed to fetch doctor availability" },
      { status: 500 }
    )
  }
}

// POST: upsert weekly availability for a specific doctor
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await setCurrentUserIdForRLS(session.user.id)

    const body = await request.json()
    const data = upsertSchema.parse(body)

    // Ensure doctor exists and is a DOCTOR
    const doctor = await prisma.user.findFirst({
      where: {
        id: data.doctorId,
        role: "DOCTOR",
      },
    })

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      )
    }

    const results = []

    for (const day of data.days) {
      // If day is marked inactive, we can either disable existing rows or delete them.
      // Here we upsert and set isActive=false so history is kept.
      const existing = await prisma.availability.findFirst({
        where: {
          doctor: {
            is: { id: data.doctorId },
          },
          dayOfWeek: day.dayOfWeek,
        },
      })

      if (existing) {
        const updated = await prisma.availability.update({
          where: { id: existing.id },
          data: {
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: day.isActive,
          },
        })
        results.push(updated)
      } else {
        const created = await prisma.availability.create({
          data: {
            doctor: {
              connect: { id: data.doctorId },
            },
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: day.isActive,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json({ success: true, availability: results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating doctor availability:", error)
    return NextResponse.json(
      { error: "Failed to update doctor availability" },
      { status: 500 }
    )
  }
}


