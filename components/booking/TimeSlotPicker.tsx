"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TimeSlotPickerProps {
  selectedDate: Date | null
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  allowFilledSelection?: boolean
  doctorId?: string | "ANY" | null
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  selectedTime,
  onTimeSelect,
  allowFilledSelection = false,
  doctorId = null,
}) => {
  const [timeSlots, setTimeSlots] = useState<
    { time: string; isFilled: boolean; display: string }[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate) {
        setTimeSlots([])
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const dateParam = format(selectedDate, "yyyy-MM-dd")
        const params = new URLSearchParams({ date: dateParam })
        if (doctorId) {
          params.append("doctorId", doctorId)
        }
        const response = await fetch(`/api/slots?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to load slots")
        }
        const data = await response.json()
        const slots = (data.timeSlots || []).map((slot: any) => ({
          time: slot.time,
          isFilled: !!slot.isFilled,
          display: format(new Date(`2000-01-01T${slot.time}`), "h:mm a"),
        }))
        setTimeSlots(slots)
      } catch (err) {
        console.error(err)
        setError("Unable to load slots. Please try another date.")
        setTimeSlots([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSlots()
  }, [selectedDate, doctorId])

  if (!selectedDate) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] rounded-full">
          <span className="text-[#86868b] text-sm font-medium">
            Please select a date first
          </span>
        </div>
      </div>
    )
  }

  const isSunday = selectedDate.getDay() === 0

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-[#1d1d1f] mb-4">
        Select Time
      </h3>
      {isLoading && (
        <div className="mb-4 text-sm text-[#86868b]">Loading slots...</div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-500">{error}</div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
        {isSunday && !isLoading ? (
          <motion.div
            className="col-span-full text-center py-6 px-4 rounded-2xl bg-gradient-to-br from-[#f5f5f7] via-white to-[#e5e7eb] border border-[#e5e5ea] shadow-sm"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <p className="text-sm font-semibold tracking-wide text-[#9ca3af] uppercase mb-2">
              Sunday Off
            </p>
            <p className="text-base sm:text-lg font-medium text-[#1d1d1f] mb-1">
              The clinic is closed on Sundays.
            </p>
            <p className="text-sm text-red-600">
              Sunday Off – Select another date.
            </p>
          </motion.div>
        ) : timeSlots.length === 0 && !isLoading ? (
          <motion.div
            className="col-span-full text-center py-6 px-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-base sm:text-lg font-medium text-[#1d1d1f] mb-1">
              No available times for this selection.
            </p>
            <p className="text-sm text-red-600">
              {doctorId && doctorId !== "ANY"
                ? "This doctor has no available slots for this date. Select another doctor or choose a different date."
                : "No slots configured for this date. Please select another date."}
            </p>
          </motion.div>
        ) : (
          timeSlots.map((slot) => {
            const isFilled = slot.isFilled
            const isSelected = selectedTime === slot.time
            const isDisabled = isFilled && !allowFilledSelection

            return (
              <button
                key={slot.time}
                onClick={() => {
                  if (!isDisabled) {
                    onTimeSelect(slot.time)
                  }
                }}
                disabled={isDisabled}
                className={cn(
                  "px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2",
                  "focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2",
                  isDisabled
                    ? "bg-[#f5f5f7] border-[#e5e5ea] text-[#a1a1aa] cursor-not-allowed"
                    : isSelected
                      ? "bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-lg scale-105"
                      : isFilled
                        ? "bg-red-50 border-red-100 text-red-700"
                        : "bg-[#ecfdf5] border-[#d1fae5] text-[#065f46] hover:bg-[#d1fae5]",
                  !isDisabled && !isFilled && "hover:scale-105"
                )}
                aria-label={`Select ${slot.display}`}
                aria-pressed={isSelected}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{slot.display}</span>
                  <span className="text-xs font-semibold">
                    {isFilled ? "Filled" : "Available"}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

