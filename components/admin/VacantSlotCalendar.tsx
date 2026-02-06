"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface Slot {
  date: string
  time: string
  isBooked: boolean
  isBlocked?: boolean
  appointment?: {
    id: string
    patientName?: string
    patient?: { name: string }
  }
}

interface VacantSlotCalendarProps {
  onSlotClick?: (date: string, time: string) => void
}

export const VacantSlotCalendar: React.FC<VacantSlotCalendarProps> = ({
  onSlotClick,
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdatingBlocks, setIsUpdatingBlocks] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    fetchSlots()
  }, [currentWeek])

  const fetchSlots = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/slots?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`
      )
      if (response.ok) {
        const data = await response.json()
        setSlots(data.slots)
      }
    } catch (error) {
      console.error("Error fetching slots:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSlotForDateTime = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return slots.find(
      (slot) => slot.date === dateStr && slot.time === time
    )
  }

  const generateTimeSlots = () => {
    const slots: string[] = []
    // Generate 30-minute slots from 09:00 to 19:00 (last slot 18:30–19:00)
    for (let hour = 9; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleToggleRow = async (time: string) => {
    const isRowBlocked = weekDays.some((day) => {
      const slot = getSlotForDateTime(day, time)
      return slot?.isBlocked
    })

    const action: "block" | "unblock" = isRowBlocked ? "unblock" : "block"

    if (isRowBlocked) {
      const confirmed = window.confirm(
        "Do you want to unblock the selected row?"
      )
      if (!confirmed) return
    }

    try {
      setIsUpdatingBlocks(true)
      const payloadSlots = weekDays.map((day) => ({
        date: format(day, "yyyy-MM-dd"),
        time,
      }))

      await fetch("/api/admin/slots/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          slots: payloadSlots,
          reason: action === "block" ? "Lunch" : undefined,
        }),
      })

      await fetchSlots()
    } catch (error) {
      console.error("Error updating row blocks:", error)
    } finally {
      setIsUpdatingBlocks(false)
    }
  }

  const handleToggleColumn = async (date: Date) => {
    const isColumnBlocked = timeSlots.some((time) => {
      const slot = getSlotForDateTime(date, time)
      return slot?.isBlocked
    })

    const action: "block" | "unblock" = isColumnBlocked ? "unblock" : "block"

    if (isColumnBlocked) {
      const confirmed = window.confirm(
        "Do you want to unblock the selected column?"
      )
      if (!confirmed) return
    }

    try {
      setIsUpdatingBlocks(true)
      const payloadSlots = timeSlots.map((time) => ({
        date: format(date, "yyyy-MM-dd"),
        time,
      }))

      await fetch("/api/admin/slots/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          slots: payloadSlots,
          reason: action === "block" ? "Holiday" : undefined,
        }),
      })

      await fetchSlots()
    } catch (error) {
      console.error("Error updating column blocks:", error)
    } finally {
      setIsUpdatingBlocks(false)
    }
  }

  return (
    <div className="w-full">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-lg font-semibold text-[#1d1d1f]">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#86868b]">Loading slots...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm font-semibold text-[#1d1d1f] border-b border-[#e5e5ea]">
                  Time
                </th>
                {weekDays.map((day) => {
                  const isColumnBlocked = timeSlots.some((time) => {
                    const slot = getSlotForDateTime(day, time)
                    return slot?.isBlocked
                  })

                  return (
                    <th
                      key={day.toString()}
                      className="p-2 text-center text-xs font-semibold text-[#1d1d1f] border-b border-[#e5e5ea] min-w-[140px]"
                    >
                      <div className="mb-1 text-sm">{format(day, "EEE")}</div>
                      <div className="text-xs text-[#86868b] mb-2">
                        {format(day, "MMM d")}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-2 py-1 rounded-full"
                        onClick={() => handleToggleColumn(day)}
                        disabled={isUpdatingBlocks}
                      >
                        {isColumnBlocked ? "Unblock day" : "Block day"}
                      </Button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time}>
                  <td className="p-2 text-sm font-medium text-[#1d1d1f] border-r border-[#e5e5ea]">
                    <div className="flex items-center gap-2">
                      <span>
                        {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-2 py-1 rounded-full"
                        onClick={() => handleToggleRow(time)}
                        disabled={isUpdatingBlocks}
                      >
                        {weekDays.some((day) => {
                          const slot = getSlotForDateTime(day, time)
                          return slot?.isBlocked
                        })
                          ? "Unblock row"
                          : "Block row"}
                      </Button>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const slot = getSlotForDateTime(day, time)
                    const isBooked = slot?.isBooked || false
                    const isBlocked = slot?.isBlocked || false
                    const patientName =
                      slot?.appointment?.patientName ||
                      slot?.appointment?.patient?.name ||
                      ""

                    return (
                      <td
                        key={`${day}-${time}`}
                        className={cn(
                          "p-2 border border-[#e5e5ea] text-center cursor-pointer transition-all text-xs",
                          isBooked
                            ? "bg-[#f4f4f5] text-[#52525b]"
                            : isBlocked
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-[#065f46] hover:bg-green-100",
                          onSlotClick &&
                            !isBooked &&
                            !isBlocked &&
                            "hover:ring-2 hover:ring-[#1E40AF]"
                        )}
                        onClick={() => {
                          if (!isBooked && !isBlocked && onSlotClick) {
                            onSlotClick(format(day, "yyyy-MM-dd"), time)
                          }
                        }}
                        title={
                          isBooked
                            ? `Booked: ${patientName}`
                            : isBlocked
                              ? "Blocked"
                              : "Available - Click to book"
                        }
                      >
                        {isBooked ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-medium text-[#111111]">
                              {patientName || "Filled"}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">
                              Filled
                            </span>
                          </div>
                        ) : isBlocked ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold">Blocked</span>
                            <span className="text-[10px] uppercase tracking-wide">
                              Closed
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold">Available</span>
                            <span className="text-[10px] uppercase tracking-wide">
                              Open
                            </span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

