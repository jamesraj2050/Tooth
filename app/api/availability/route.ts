import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format, getDay, startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const doctorId = searchParams.get("doctorId")

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      )
    }

    const requestedDate = new Date(date)
    const dayOfWeek = getDay(requestedDate)

    // Resolve availability for this day (optionally doctor-specific)
    let availability =
      doctorId && doctorId !== "ANY"
        ? await prisma.availability.findFirst({
            where: {
              dayOfWeek,
              isActive: true,
              doctor: {
                is: { id: doctorId },
              },
            },
          })
        : null

    if (!availability) {
      availability = await prisma.availability.findFirst({
        where: {
          dayOfWeek,
          isActive: true,
          doctorId: null,
        },
      })
    }

    if (!availability) {
      return NextResponse.json({ available: false, slots: [] })
    }

    // Get booked appointments for the day
    const start = startOfDay(requestedDate)
    const end = endOfDay(requestedDate)

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        status: {
          not: "CANCELLED",
        },
        ...(doctorId && doctorId !== "ANY"
          ? {
              doctor: {
                is: { id: doctorId },
              },
            }
          : {}),
      },
    })

    // Generate time slots
    const [startHour, startMinute] = availability.startTime.split(":").map(Number)
    const [endHour, endMinute] = availability.endTime.split(":").map(Number)

    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute >= endMinute) break
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push(timeString)
      }
    }

    // Filter out booked slots
    const bookedTimes = appointments.map((apt) =>
      format(apt.date, "HH:mm")
    )

    const availableSlots = slots.filter((slot) => !bookedTimes.includes(slot))

    return NextResponse.json({
      available: true,
      slots: availableSlots,
    })
  } catch (error) {
    console.error("Error fetching availability:", error)
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}

