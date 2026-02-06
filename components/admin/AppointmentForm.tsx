"use client"

import { useState } from "react"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { CalendarView } from "@/components/calendar/CalendarView"
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker"

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<AppointmentFormData>
  isLoading?: boolean
  allowFilledSelection?: boolean
  // Optional: list of doctors to assign this appointment to (used by admin)
  doctors?: { id: string; name: string | null; email: string }[]
  // When true and doctors provided, require selecting a doctor
  requireDoctor?: boolean
  // Default doctor id (used by doctor dashboard to implicitly assign)
  defaultDoctorId?: string | null
}

export interface AppointmentFormData {
  date: Date | null
  time: string | null
  name: string
  email: string
  phone: string
  service: string
  notes?: string
  doctorId?: string | null
}

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning", duration: "30 min" },
  { id: "checkup", name: "Dental Checkup", duration: "45 min" },
  { id: "whitening", name: "Teeth Whitening", duration: "60 min" },
  { id: "filling", name: "Filling", duration: "45 min" },
  { id: "extraction", name: "Tooth Extraction", duration: "30 min" },
  { id: "consultation", name: "Consultation", duration: "30 min" },
]

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  allowFilledSelection = false,
  doctors,
  requireDoctor = false,
  defaultDoctorId = null,
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    date: initialData?.date || null,
    time: initialData?.time || null,
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    service: initialData?.service || "",
    notes: initialData?.notes || "",
    doctorId: initialData?.doctorId ?? defaultDoctorId ?? null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.date) {
      newErrors.date = "Date is required"
    }
    if (!formData.time) {
      newErrors.time = "Time is required"
    }
    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required"
    }
    if (!formData.service) {
      newErrors.service = "Service is required"
    }

    if (doctors && doctors.length > 0 && requireDoctor && !formData.doctorId) {
      newErrors.doctorId = "Please select a dentist"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      await onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Selection */}
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
          Service *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                setFormData({ ...formData, service: service.name })
                if (errors.service) setErrors({ ...errors, service: "" })
              }}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                formData.service === service.name
                  ? "border-[#1E40AF] bg-[#1E40AF]/10"
                  : "border-[#e5e5ea] hover:border-[#1E40AF]/50"
              }`}
            >
              <p className="font-medium text-[#1d1d1f]">{service.name}</p>
              <p className="text-sm text-[#86868b]">{service.duration}</p>
            </button>
          ))}
        </div>
        {errors.service && (
          <p className="mt-1 text-sm text-red-500">{errors.service}</p>
        )}
      </div>

      {/* Doctor Selection (optional, admin use) */}
      {doctors && doctors.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
            Assign Dentist{requireDoctor ? " *" : ""}{" "}
          </label>
          <p className="text-xs text-[#6b7280] mb-2">
            {requireDoctor
              ? "Select which dentist will handle this visit."
              : "Optionally assign a dentist. If you skip this, the system will auto‑assign based on availability."}
          </p>
          <div className="flex flex-wrap gap-2">
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, doctorId: doctor.id })
                  if (errors.doctorId) setErrors({ ...errors, doctorId: "" })
                }}
                className={`px-3 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                  formData.doctorId === doctor.id
                    ? "border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF]"
                    : "border-[#e5e5ea] bg-white text-[#4b5563] hover:border-[#1E40AF]/50"
                }`}
              >
                {doctor.name || doctor.email}
              </button>
            ))}
          </div>
          {errors.doctorId && (
            <p className="mt-1 text-sm text-red-500">{errors.doctorId}</p>
          )}
        </div>
      )}

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
          Date *
        </label>
        <CalendarView
          selectedDate={formData.date}
          onDateSelect={(date) => {
            setFormData({ ...formData, date })
            if (errors.date) setErrors({ ...errors, date: "" })
          }}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-500">{errors.date}</p>
        )}
      </div>

      {/* Time Selection */}
      {formData.date && (
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
            Time *
          </label>
          <TimeSlotPicker
            selectedDate={formData.date}
            selectedTime={formData.time}
            onTimeSelect={(time) => {
              setFormData({ ...formData, time })
              if (errors.time) setErrors({ ...errors, time: "" })
            }}
            allowFilledSelection={allowFilledSelection}
            doctorId={formData.doctorId ?? defaultDoctorId ?? null}
          />
          {errors.time && (
            <p className="mt-1 text-sm text-red-500">{errors.time}</p>
          )}
        </div>
      )}

      {/* Patient Information */}
      <div className="space-y-4">
        <Input
          label="Full Name *"
          type="text"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value })
            if (errors.name) setErrors({ ...errors, name: "" })
          }}
          error={errors.name}
          placeholder="Enter patient name"
        />
        <Input
          label="Email *"
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value })
            if (errors.email) setErrors({ ...errors, email: "" })
          }}
          error={errors.email}
          placeholder="patient@example.com"
        />
        <Input
          label="Phone Number *"
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value })
            if (errors.phone) setErrors({ ...errors, phone: "" })
          }}
          error={errors.phone}
          placeholder="(08) 1234 5678"
        />
        <Textarea
          label="Notes (Optional)"
          rows={3}
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e5ea]">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading} loading={isLoading}>
          {initialData ? "Update Appointment" : "Create Appointment"}
        </Button>
      </div>
    </form>
  )
}

