import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format, getDay, startOfDay, endOfDay } from "date-fns"

const SLOT_INTERVAL_MINUTES = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const doctorId = searchParams.get("doctorId")

    if (!dateParam) {
      return NextResponse.json(
        { error: "date query parameter is required" },
        { status: 400 }
      )
    }

    // Treat yyyy-MM-dd as a local date to avoid UTC day shifts
    const requestedDate = new Date(`${dateParam}T00:00:00`)
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }

    const dayOfWeek = getDay(requestedDate)

    // Resolve working hours for this day:
    // - If a specific doctor is requested: prefer that doctor's schedule, then fall back to global.
    // - If "ANY" or no doctorId: combine all active schedules on that day to derive overall range.
    let startHour = 9
    let startMinute = 0
    let endHour = 17
    let endMinute = 0

    if (doctorId && doctorId !== "ANY") {
      // For a specific doctor:
      // - If the doctor has an explicit schedule row for this weekday and it's inactive,
      //   treat as a holiday/off day (do NOT fall back to global hours).
      // - If the doctor has an active schedule row, use it.
      // - If the doctor has no schedule row at all, fall back to global hours.
      const doctorSchedule = await prisma.availability.findFirst({
        where: {
          dayOfWeek,
          doctorId,
        },
      })

      if (doctorSchedule) {
        if (!doctorSchedule.isActive) {
          return NextResponse.json({ timeSlots: [] })
        }
        ;[startHour, startMinute] = doctorSchedule.startTime.split(":").map(Number)
        ;[endHour, endMinute] = doctorSchedule.endTime.split(":").map(Number)
      } else {
        const globalSchedule = await prisma.availability.findFirst({
          where: {
            dayOfWeek,
            isActive: true,
            doctorId: null,
          },
        })

        if (!globalSchedule) {
          return NextResponse.json({ timeSlots: [] })
        }

        ;[startHour, startMinute] = globalSchedule.startTime.split(":").map(Number)
        ;[endHour, endMinute] = globalSchedule.endTime.split(":").map(Number)
      }
    } else {
      // ANY / no doctor: look at all active schedules for that weekday
      const availabilities = await prisma.availability.findMany({
        where: {
          dayOfWeek,
          isActive: true,
        },
      })

      if (availabilities.length === 0) {
        return NextResponse.json({ timeSlots: [] })
      }

      let minStartMinutes = Number.POSITIVE_INFINITY
      let maxEndMinutes = 0

      for (const a of availabilities) {
        const [sh, sm] = a.startTime.split(":").map(Number)
        const [eh, em] = a.endTime.split(":").map(Number)
        const startTotal = sh * 60 + sm
        const endTotal = eh * 60 + em
        if (startTotal < minStartMinutes) minStartMinutes = startTotal
        if (endTotal > maxEndMinutes) maxEndMinutes = endTotal
      }

      if (!Number.isFinite(minStartMinutes) || maxEndMinutes <= minStartMinutes) {
        return NextResponse.json({ timeSlots: [] })
      }

      startHour = Math.floor(minStartMinutes / 60)
      startMinute = minStartMinutes % 60
      endHour = Math.floor(maxEndMinutes / 60)
      endMinute = maxEndMinutes % 60
    }

    const slots: { time: string; isFilled: boolean }[] = []
    const slotTimes: string[] = []

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
        if (hour === endHour && minute >= endMinute) break
        slotTimes.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
      }
    }

    // Load appointments for this day (optionally scoped to a specific doctor)
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(requestedDate),
          lte: endOfDay(requestedDate),
        },
        status: {
          notIn: ["CANCELLED"],
        },
        ...(doctorId && doctorId !== "ANY"
          ? {
              doctor: {
                is: { id: doctorId },
              },
            }
          : {}),
      },
      select: {
        date: true,
        doctor: {
          select: { id: true },
        },
      },
    })

    // Load any blocked slots for this specific day
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        date: {
          gte: startOfDay(requestedDate),
          lte: endOfDay(requestedDate),
        },
      },
    })
    const blockedTimes = new Set(
      blockedSlots.map((b) => format(b.date, "HH:mm"))
    )

    // Map of time string -> set of doctor ids who are booked at that time
    const bookedByTime = new Map<string, Set<string>>()

    for (const apt of appointments) {
      const time = format(apt.date, "HH:mm")
      const docId = apt.doctor?.id

      if (!bookedByTime.has(time)) {
        bookedByTime.set(time, new Set())
      }

      if (docId) {
        bookedByTime.get(time)!.add(docId)
      }
    }

    let totalDoctors = 0

    // For "Any dentist", capacity is based on the total number of dentists:
    // a slot is only "filled" when all dentists are booked at that time.
    if (!doctorId || doctorId === "ANY") {
      const doctors = await prisma.user.findMany({
        where: { role: "DOCTOR" },
        select: { id: true },
      })
      totalDoctors = doctors.length
    }

    slotTimes.forEach((time) => {
      // Skip times that are explicitly blocked (e.g., lunch, holidays)
      if (blockedTimes.has(time)) {
        return
      }

      const bookedSet = bookedByTime.get(time) ?? new Set<string>()

      let isFilled = false
      if (doctorId && doctorId !== "ANY") {
        // Specific dentist: the slot is filled if they have any appointment at that time
        isFilled = bookedSet.size > 0
      } else if (totalDoctors > 0) {
        // "Any dentist": slot is filled only when all dentists are already booked
        const distinctBookedDoctors = bookedSet.size
        isFilled = distinctBookedDoctors >= totalDoctors
      }

      slots.push({
        time,
        isFilled,
      })
    })

    return NextResponse.json({ timeSlots: slots })
  } catch (error) {
    console.error("Error fetching slot status:", error)
    return NextResponse.json(
      { error: "Failed to fetch slot availability" },
      { status: 500 }
    )
  }
}


