"use client"

import { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfDay,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  unavailableDates?: Date[]
  minDate?: Date
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  unavailableDates = [],
  minDate = new Date(),
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const normalizedMinDate = startOfDay(minDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const firstDayOfWeek = getDay(monthStart)
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  const isDateUnavailable = (date: Date) => {
    if (date < normalizedMinDate) return true
    return unavailableDates.some((unavailable) => isSameDay(date, unavailable))
  }

  const isDateSelected = (date: Date) => {
    return selectedDate ? isSameDay(date, selectedDate) : false
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-[#f5f5f7] rounded-full transition-all duration-200"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-[#1d1d1f]" />
        </Button>
        <h3 className="text-xl font-semibold text-[#1d1d1f]">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="p-2 hover:bg-[#f5f5f7] rounded-full transition-all duration-200"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-[#1d1d1f]" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-[#86868b] py-2"
          >
            {day}
          </div>
        ))}

        {/* Empty cells for days before month start */}
        {daysBeforeMonth.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {daysInMonth.map((day) => {
          const unavailable = isDateUnavailable(day)
          const selected = isDateSelected(day)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={day.toString()}
              onClick={() => !unavailable && onDateSelect(day)}
              disabled={unavailable}
              className={cn(
                "aspect-square rounded-xl transition-all duration-200",
                "flex items-center justify-center text-sm font-medium",
                "focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2",
                unavailable
                  ? "text-[#86868b] cursor-not-allowed opacity-30 bg-[#f5f5f7]"
                  : "cursor-pointer",
                selected
                  ? "bg-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-lg scale-105"
                  : isToday
                  ? "bg-[#1E40AF]/10 text-[#1E40AF] font-semibold border-2 border-[#1E40AF]/30 hover:bg-[#1E40AF]/20"
                  : "text-[#1d1d1f] hover:bg-[#f5f5f7] hover:scale-105"
              )}
              aria-label={`Select ${format(day, "EEEE, MMMM d, yyyy")}`}
              aria-pressed={selected}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

