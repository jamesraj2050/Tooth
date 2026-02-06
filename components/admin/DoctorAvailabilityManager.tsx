"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type Doctor = {
  id: string
  name: string | null
  email: string
}

type AvailabilityRow = {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  source?: "doctor" | "global"
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface DoctorAvailabilityManagerProps {
  doctors: Doctor[]
}

export const DoctorAvailabilityManager: React.FC<DoctorAvailabilityManagerProps> = ({
  doctors,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [rows, setRows] = useState<AvailabilityRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  )

  // Initialize selected doctor
  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id)
    }
  }, [doctors, selectedDoctorId])

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDoctorId) return
      setIsLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const res = await fetch(`/api/admin/availability?doctorId=${selectedDoctorId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load availability")
        }
        const data = await res.json()
        const doctorAvailability: any[] = data.doctorAvailability || []
        const globalDefaults: any[] = data.globalDefaults || []

        const byDay: Record<number, AvailabilityRow> = {}

        // Apply global defaults first
        for (const g of globalDefaults) {
          byDay[g.dayOfWeek] = {
            id: g.id,
            dayOfWeek: g.dayOfWeek,
            startTime: g.startTime,
            endTime: g.endTime,
            isActive: g.isActive,
            source: "global",
          }
        }

        // Override with doctor-specific rows
        for (const d of doctorAvailability) {
          byDay[d.dayOfWeek] = {
            id: d.id,
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            isActive: d.isActive,
            source: "doctor",
          }
        }

        const merged: AvailabilityRow[] = []
        for (let day = 0; day < 7; day++) {
          const row = byDay[day]
          if (row) {
            merged.push(row)
          } else {
            merged.push({
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
              isActive: false,
            })
          }
        }

        setRows(merged)
      } catch (e: any) {
        console.error(e)
        setError(e.message || "Failed to load availability")
        setRows([])
      } finally {
        setIsLoading(false)
      }
    }

    loadAvailability()
  }, [selectedDoctorId])

  const updateRow = (dayOfWeek: number, patch: Partial<AvailabilityRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              ...patch,
              // When editing, treat as doctor-specific override
              source: row.source === "global" ? "doctor" : row.source,
            }
          : row
      )
    )
    setSuccess(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!selectedDoctorId) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          days: rows.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: r.isActive,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save availability")
      }
      setSuccess("Schedule updated successfully.")
    } catch (e: any) {
      console.error(e)
      setError(e.message || "Failed to save availability")
    } finally {
      setIsSaving(false)
    }
  }

  if (doctors.length === 0) {
    return (
      <Card className="bg-white border border-[#e4e4e7] shadow-sm p-4 sm:p-6">
        <p className="text-sm text-[#6b7280]">
          No doctors found. Create a doctor account first, then configure their schedule here.
        </p>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-[#e4e4e7] shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#111111] tracking-tight">
            Doctor Schedules
          </h2>
          <p className="text-xs sm:text-sm text-[#6b7280]">
            Set working days and hours for each dentist. Patients can only book within these slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#4b5563]">Select Doctor</label>
          <select
            className="border border-[#e4e4e7] rounded-lg px-2 py-1 text-sm bg-white"
            value={selectedDoctorId ?? ""}
            onChange={(e) => setSelectedDoctorId(e.target.value || null)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDoctor && (
        <p className="mb-4 text-xs text-[#6b7280]">
          Editing schedule for{" "}
          <span className="font-medium text-[#111111]">
            {selectedDoctor.name || selectedDoctor.email}
          </span>
          .
        </p>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-[#6b7280]">Loading schedule…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e4e4e7] bg-[#f4f4f5] text-xs uppercase tracking-wide text-[#6b7280]">
                <th className="text-left py-3 px-3 font-semibold">Day</th>
                <th className="text-left py-3 px-3 font-semibold">Active</th>
                <th className="text-left py-3 px-3 font-semibold">Start Time</th>
                <th className="text-left py-3 px-3 font-semibold">End Time</th>
                <th className="text-left py-3 px-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.dayOfWeek} className="border-b border-[#f1f1f3]">
                  <td className="py-3 px-3 text-[#111111]">{DAY_LABELS[row.dayOfWeek]}</td>
                  <td className="py-3 px-3">
                    <label className="inline-flex items-center gap-2 text-xs text-[#4b5563]">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) =>
                          updateRow(row.dayOfWeek, { isActive: e.target.checked })
                        }
                      />
                      <span>{row.isActive ? "Enabled" : "Off"}</span>
                    </label>
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="time"
                      className={cn(
                        "border rounded-lg px-2 py-1 text-sm w-28",
                        "border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      )}
                      value={row.startTime}
                      onChange={(e) =>
                        updateRow(row.dayOfWeek, { startTime: e.target.value })
                      }
                      disabled={!row.isActive}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="time"
                      className={cn(
                        "border rounded-lg px-2 py-1 text-sm w-28",
                        "border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      )}
                      value={row.endTime}
                      onChange={(e) =>
                        updateRow(row.dayOfWeek, { endTime: e.target.value })
                      }
                      disabled={!row.isActive}
                    />
                  </td>
                  <td className="py-3 px-3 text-xs text-[#6b7280]">
                    {row.source === "doctor"
                      ? "Custom"
                      : row.source === "global"
                      ? "Inherits global"
                      : "Not set"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || !selectedDoctorId}
          loading={isSaving}
        >
          Save Schedule
        </Button>
      </div>
    </Card>
  )
}


