import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { format, startOfDay, endOfDay, eachDayOfInterval, getDay } from "date-fns"

// GET: Get all time slots for a date range with booked/vacant status
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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = eachDayOfInterval({ start, end })

    const slots: Array<{
      date: string
      time: string
      isBooked: boolean
      isBlocked?: boolean
      appointment?: any
    }> = []

    // Get all appointments in the date range
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
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

    // Get any explicitly blocked slots in the date range
    const blocked = await prisma.blockedSlot.findMany({
      where: {
        date: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
    })

    const blockedKeys = new Set(
      blocked.map((b) => `${format(b.date, "yyyy-MM-dd")}|${format(b.date, "HH:mm")}`)
    )

    // Generate time slots for each day
    for (const day of days) {
      const dayOfWeek = getDay(day)
      
      // Get availability for this day
      const availability = await prisma.availability.findFirst({
        where: {
          dayOfWeek,
          isActive: true,
        },
      })

      if (!availability) continue

      const [startHour, startMinute] = availability.startTime.split(":").map(Number)
      const [endHour, endMinute] = availability.endTime.split(":").map(Number)

      // Generate 30-minute slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === endHour && minute >= endMinute) break
          
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
          const slotDateTime = new Date(day)
          slotDateTime.setHours(hour, minute, 0, 0)

          // Check if this slot is booked
          const appointment = appointments.find((apt: { date: Date }) => {
            const aptDate = new Date(apt.date)
            return (
              format(aptDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd") &&
              format(aptDate, "HH:mm") === timeString
            )
          })

          const key = `${format(day, "yyyy-MM-dd")}|${timeString}`
          const isBlocked = blockedKeys.has(key)

          slots.push({
            date: format(day, "yyyy-MM-dd"),
            time: timeString,
            isBooked: !!appointment,
            isBlocked,
            appointment: appointment || undefined,
          })
        }
      }
    }

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("Error fetching slots:", error)
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    )
  }
}

