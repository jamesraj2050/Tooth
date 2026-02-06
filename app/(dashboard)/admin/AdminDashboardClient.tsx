"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { AppointmentForm, AppointmentFormData } from "@/components/admin/AppointmentForm"
import { ReportExport } from "@/components/admin/ReportExport"
import { VacantSlotCalendar } from "@/components/admin/VacantSlotCalendar"
import { DoctorAvailabilityManager } from "@/components/admin/DoctorAvailabilityManager"
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Filter,
} from "lucide-react"
import { addDays, endOfDay, format, isSameDay, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  date: string
  service: string
  status: string
  paymentAmount: number | null
  paymentStatus: string | null
  treatmentStatus?: string | null
  createdBy?: string | null
  adminConfirmed?: boolean | null
  patient: {
    name: string
    email: string
    phone: string | null
  } | null
  patientName: string | null
  patientEmail: string | null
  patientPhone: string | null
  doctor?: {
    name: string | null
    email: string
  } | null
}

interface AdminDashboardClientProps {
  initialAppointments: Appointment[]
  stats: {
    total: number
    today: number
    upcoming: number
    patients: number
  }
}

export const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  initialAppointments,
  stats,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [activeTab, setActiveTab] = useState<
    "appointments" | "slots" | "reports" | "doctors" | "schedules"
  >("appointments")
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [prefilledSlot, setPrefilledSlot] = useState<{ date: string; time: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<
    { id: string; name: string; email: string; phone: string | null; createdAt: string }[]
  >([])
  const [reportDoctorId, setReportDoctorId] = useState<string>("") // empty string = all doctors
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [doctorForm, setDoctorForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [doctorError, setDoctorError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  // Filter appointments from current date ascending
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const displayedAppointments = sortedAppointments.filter((apt) =>
    isSameDay(new Date(apt.date), currentDate)
  )

  const formatPaymentAmount = (amount: number | null) => {
    if (amount === null || Number.isNaN(amount)) {
      return "$0.00"
    }
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPaymentBadgeClass = (status: string | null) => {
    switch (status) {
      case "PAID":
        return "bg-[#e4e4e7] text-[#111111]"
      case "PARTIAL":
        return "bg-[#f4f4f5] text-[#3f3f46]"
      default:
        return "bg-[#1f2933] text-white"
    }
  }

  const handleCreateAppointment = async (data: AppointmentFormData) => {
    setIsLoading(true)
    try {
      const appointmentDate = new Date(data.date!)
      const [hours, minutes] = data.time!.split(":").map(Number)
      appointmentDate.setHours(hours, minutes, 0, 0)

      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          date: appointmentDate.toISOString(),
        }),
      })

      if (response.ok) {
        const { appointment } = await response.json()
        setAppointments([...appointments, appointment])
        setShowAppointmentModal(false)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create appointment")
      }
    } catch (error) {
      console.error("Error creating appointment:", error)
      alert("Failed to create appointment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAppointments(appointments.filter((apt) => apt.id !== id))
      } else {
        alert("Failed to delete appointment")
      }
    } catch (error) {
      console.error("Error deleting appointment:", error)
      alert("Failed to delete appointment")
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh appointments for the currently selected date in the Appointments tab
  const refreshAppointmentsForCurrentDate = async () => {
    try {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(currentDate)
      end.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })

      const response = await fetch(`/api/admin/appointments?${params.toString()}`)
      if (!response.ok) return

      const { appointments } = await response.json()
      setAppointments((prev) => {
        const prevMap = new Map(prev.map((a) => [a.id, a]))

        return (appointments || []).map((apt: any) => {
          const prevApt = prevMap.get(apt.id)
          return {
            ...apt,
            paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
            adminConfirmed:
              typeof apt.adminConfirmed === "boolean"
                ? apt.adminConfirmed
                : prevApt?.adminConfirmed ?? false,
          }
        })
      })
    } catch (error) {
      console.error("Error refreshing appointments:", error)
    }
  }

  const handleExportReport = async (
    type: "weekly" | "monthly",
    startDate: Date,
    endDate: Date,
    formatType: "excel" | "pdf"
  ) => {
    setIsLoading(true)
    try {
      if (formatType === "excel") {
        // For Excel, fetch data and generate client-side
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })

        if (reportDoctorId) {
          params.append("doctorId", reportDoctorId)
        }

        const response = await fetch(`/api/admin/appointments?${params.toString()}`)

        if (response.ok) {
          const { appointments } = await response.json()
          const reportData = appointments.map((apt: any) => ({
            date: apt.date,
            time: format(new Date(apt.date), "HH:mm"),
            name: apt.patient?.name || apt.patientName || "N/A",
            phone: apt.patient?.phone || apt.patientPhone || "N/A",
            email: apt.patient?.email || apt.patientEmail || "N/A",
            service: apt.service,
            doctor: apt.doctor?.name || apt.doctor?.email || "N/A",
            paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
            paymentStatus: apt.paymentStatus || "PENDING",
          }))
          
          const { generateExcelReport } = await import("@/lib/reports")
          generateExcelReport(
            reportData,
            `${type}_report_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}`
          )
        } else {
          alert("Failed to fetch data for report")
        }
      } else {
        // For PDF, download from server
        const params = new URLSearchParams({
          type,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: formatType,
        })

        if (reportDoctorId) {
          params.append("doctorId", reportDoctorId)
        }

        const response = await fetch(`/api/admin/reports?${params.toString()}`)

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${type}_report_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          alert("Failed to generate report")
        }
      }
    } catch (error) {
      console.error("Error exporting report:", error)
      alert("Failed to export report")
    } finally {
      setIsLoading(false)
    }
  }

  const getPatientName = (apt: Appointment) => {
    return apt.patient?.name || apt.patientName || "N/A"
  }

  const getPatientEmail = (apt: Appointment) => {
    return apt.patient?.email || apt.patientEmail || "N/A"
  }

  const getPatientPhone = (apt: Appointment) => {
    return apt.patient?.phone || apt.patientPhone || "N/A"
  }

  const getTreatmentBadgeClass = (status: string | null | undefined) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 border border-green-200"
      case "PARTIAL":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200"
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200"
    }
  }

  // Load doctors once on mount so they are available for Reports, Doctors and Schedules tabs
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetch("/api/admin/doctors")
        if (!res.ok) return
        const data = await res.json()
        setDoctors(
          (data.doctors || []).map((d: any) => ({
            ...d,
            createdAt: d.createdAt,
          }))
        )
      } catch {
        // ignore
      }
    }
    loadDoctors()
  }, [])

  // Auto-refresh appointments every 30 seconds when on the Appointments tab
  useEffect(() => {
    if (activeTab !== "appointments") return

    let cancelled = false

    // Initial refresh when tab/date becomes active
    refreshAppointmentsForCurrentDate()

    const intervalId = setInterval(() => {
      if (!cancelled) {
        refreshAppointmentsForCurrentDate()
      }
    }, 20000) // 20 seconds

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [activeTab, currentDate])

  const handleCreateDoctor = async () => {
    setDoctorError(null)
    if (!doctorForm.name || !doctorForm.email || !doctorForm.password) {
      setDoctorError("Name, email and password are required")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: doctorForm.name,
          email: doctorForm.email,
          password: doctorForm.password,
          phone: doctorForm.phone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDoctorError(data.error || "Failed to create doctor")
      } else {
        setDoctors((prev) => [...prev, data.doctor])
        setDoctorForm({ name: "", email: "", phone: "", password: "" })
        setShowDoctorModal(false)
      }
    } catch (e) {
      console.error("Error creating doctor:", e)
      setDoctorError("Failed to create doctor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmPayment = async (appointmentId: string) => {
    setProcessingPaymentId(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID" }),
      })

      if (response.ok) {
        const { appointment } = await response.json()
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointment.id ? { ...apt, paymentStatus: appointment.paymentStatus } : apt
          )
        )
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update payment status")
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      alert("Failed to update payment status")
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const handleToggleAdminConfirm = async (appointment: Appointment) => {
    const currentlyConfirmed = !!appointment.adminConfirmed

    if (currentlyConfirmed) {
      const ok = window.confirm("Are you sure to unconfirm the appointment?")
      if (!ok) return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminConfirmed: !currentlyConfirmed }),
      })

      if (response.ok) {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointment.id
              ? { ...apt, adminConfirmed: !currentlyConfirmed }
              : apt
          )
        )
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || "Failed to update confirmation")
      }
    } catch (error) {
      console.error("Error updating confirmation:", error)
      alert("Failed to update confirmation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to delete this doctor? This will remove their login.")) {
      return
    }

    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to delete doctor")
        return
      }
      setDoctors((prev) => prev.filter((d) => d.id !== doctorId))
    } catch (e) {
      console.error("Error deleting doctor:", e)
      alert("Failed to delete doctor")
    }
  }

  const handleDownloadReceipt = async (appointmentId: string) => {
    setDownloadingReceiptId(appointmentId)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/receipt`)
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to generate receipt")
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `receipt-${appointmentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading receipt:", error)
      alert("Failed to download receipt")
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-6 sm:py-8 text-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#111111] mb-1 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[#4b5563]">
            Centralized schedule and phone-in bookings
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { label: "Total", value: stats.total, icon: Calendar },
            { label: "Today", value: stats.today, icon: Clock },
            { label: "Upcoming", value: stats.upcoming, icon: TrendingUp },
            { label: "Patients", value: stats.patients, icon: Users },
          ].map((card) => {
            const isTodayCard = card.label === "Today"
            const isUpcomingCard = card.label === "Upcoming"
            return (
              <button
                key={card.label}
                type="button"
                className="text-left"
                onClick={() => {
                  if (isTodayCard) {
                    setActiveTab("appointments")
                    setCurrentDate(new Date())
                  } else if (isUpcomingCard) {
                    // Find the next appointment on a future date (after today)
                    const todayStart = startOfDay(new Date())
                    const todayEnd = endOfDay(todayStart)
                    const next = sortedAppointments.find(
                      (apt) => new Date(apt.date).getTime() > todayEnd.getTime()
                    )
                    if (next) {
                      setActiveTab("appointments")
                      setCurrentDate(new Date(next.date))
                    }
                  }
                }}
              >
                <Card
                  className={
                    "bg-white border border-[#e4e4e7] shadow-sm transition-transform duration-150 " +
                    (isTodayCard || isUpcomingCard
                      ? "hover:-translate-y-0.5 cursor-pointer"
                      : "")
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#f4f4f5] flex items-center justify-center">
                      <card.icon className="w-5 h-5 text-[#52525b]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#6b7280]">
                        {card.label}
                      </p>
                      <p className="text-xl font-semibold text-[#111111] leading-tight">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-[#e4e4e7]">
          <div className="flex gap-2 sm:gap-3 text-sm font-medium">
            <button
              onClick={() => setActiveTab("appointments")}
              className={cn(
                "relative pb-3 pt-1 px-3 rounded-full transition-all",
                activeTab === "appointments"
                  ? "text-[#111111] bg-white shadow-sm"
                  : "text-[#6b7280] hover:text-[#111111] hover:bg-white/60"
              )}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={cn(
                "relative pb-3 pt-1 px-3 rounded-full transition-all",
                activeTab === "reports"
                  ? "text-[#111111] bg-white shadow-sm"
                  : "text-[#6b7280] hover:text-[#111111] hover:bg-white/60"
              )}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab("doctors")}
              className={cn(
                "relative pb-3 pt-1 px-3 rounded-full transition-all",
                activeTab === "doctors"
                  ? "text-[#111111] bg-white shadow-sm"
                  : "text-[#6b7280] hover:text-[#111111] hover:bg-white/60"
              )}
            >
              Doctors
            </button>
            <button
              onClick={() => setActiveTab("slots")}
              className={cn(
                "relative pb-3 pt-1 px-3 rounded-full transition-all",
                activeTab === "slots"
                  ? "text-[#111111] bg-white shadow-sm"
                  : "text-[#6b7280] hover:text-[#111111] hover:bg-white/60"
              )}
            >
              Vacant Slots
            </button>
            <button
              onClick={() => setActiveTab("schedules")}
              className={cn(
                "relative pb-3 pt-1 px-3 rounded-full transition-all",
                activeTab === "schedules"
                  ? "text-[#111111] bg-white shadow-sm"
                  : "text-[#6b7280] hover:text-[#111111] hover:bg-white/60"
              )}
            >
              Doctor Schedules
            </button>
          </div>
        </div>

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-semibold text-[#111111] tracking-tight">
                  Appointments
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-[#4b5563]">
                  <span>
                    {`Selected date: ${format(currentDate, "EEE, MMM d, yyyy")}${
                      isSameDay(currentDate, new Date()) ? " (Today)" : ""
                    }`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1"
                      onClick={() => setCurrentDate((prev) => addDays(prev, -1))}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1"
                      onClick={() => setCurrentDate((prev) => addDays(prev, 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white text-sm"
                onClick={() => {
                  setEditingAppointment(null)
                  setShowAppointmentModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Appointment
              </Button>
            </div>

            {displayedAppointments.length === 0 ? (
              <div className="text-center py-12 text-[#86868b]">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No appointments for this date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] text-xs uppercase tracking-wide text-[#6b7280] bg-[#f4f4f5]">
                      <th className="text-left py-3 px-4 font-semibold">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Time Slot
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Patient Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Mobile Number
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Email ID
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Treatment
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Doctor
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Doctor Payment Update
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className={cn(
                          "border-b transition-colors",
                          appointment.paymentStatus === "PAID"
                            ? "bg-green-50 border-green-100 hover:bg-green-100"
                            : "border-[#f1f1f3] hover:bg-[#f9fafb]"
                        )}
                      >
                        <td className="py-4 px-4">
                          <p className="font-medium text-[#111111] text-sm">
                            {format(new Date(appointment.date), "MMM d, yyyy")}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-[#111111] text-sm">
                            {format(new Date(appointment.date), "h:mm a")}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-[#111111] text-sm">
                            {getPatientName(appointment)}
                          </p>
                          {appointment.createdBy && (
                            <p className="text-xs text-[#6b7280] mt-0.5">
                              Created by{" "}
                              {appointment.createdBy.charAt(0).toUpperCase() +
                                appointment.createdBy.slice(1)}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-[#27272a] text-sm">{getPatientPhone(appointment)}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-[#27272a] text-sm break-all">
                            {getPatientEmail(appointment)}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold",
                              getTreatmentBadgeClass(appointment.treatmentStatus)
                            )}
                          >
                            {appointment.treatmentStatus || "PENDING"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-[#111111]">
                            {appointment.doctor?.name ||
                              appointment.doctor?.email ||
                              "Unassigned"}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-[#1d1d1f]">
                              {formatPaymentAmount(
                                appointment.paymentAmount
                                  ? Number(appointment.paymentAmount)
                                  : null
                              )}
                            </p>
                            <span
                              className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getPaymentBadgeClass(
                                appointment.paymentStatus
                              )}`}
                            >
                              {appointment.paymentStatus || "PENDING"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <label className="flex items-center gap-1 text-xs text-[#4b5563]">
                              <input
                                type="checkbox"
                                className="h-3 w-3 rounded border-[#d4d4d8]"
                                checked={!!appointment.adminConfirmed}
                                onChange={() => handleToggleAdminConfirm(appointment)}
                              />
                              <span>Phone confirmed</span>
                            </label>
                            {appointment.paymentStatus !== "PAID" && appointment.paymentAmount ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                                onClick={() => handleConfirmPayment(appointment.id)}
                                disabled={processingPaymentId === appointment.id}
                              >
                                {processingPaymentId === appointment.id ? "Updating..." : "Mark Received"}
                              </Button>
                            ) : null}
                            <button
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </Card>
        )}

        {/* Doctors Tab */}
        {activeTab === "doctors" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className="text-lg sm:text-xl font-semibold text-[#111111] tracking-tight">
                Doctor Accounts
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                onClick={() => setShowDoctorModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Doctor
              </Button>
            </div>

            {doctors.length === 0 ? (
              <div className="text-center py-10 text-[#6b7280] text-sm">
                No doctors created yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] text-xs uppercase tracking-wide text-[#6b7280] bg-[#f4f4f5]">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Created</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor.id} className="border-b border-[#f1f1f3]">
                        <td className="py-3 px-4 font-medium text-[#111111]">
                          {doctor.name || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-[#27272a] break-all">
                          {doctor.email}
                        </td>
                        <td className="py-3 px-4 text-[#27272a]">
                          {doctor.phone || "—"}
                        </td>
                        <td className="py-3 px-4 text-[#6b7280]">
                          {doctor.createdAt
                            ? format(new Date(doctor.createdAt), "MMM d, yyyy")
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteDoctor(doctor.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete doctor"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Modal
              isOpen={showDoctorModal}
              onClose={() => {
                setShowDoctorModal(false)
                setDoctorError(null)
              }}
              title="Add Doctor Login"
            >
              <div className="space-y-4">
                <p className="text-sm text-[#4b5563]">
                  Create a login for a new dentist. You can create up to 5 doctor accounts.
                </p>
                {doctorError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {doctorError}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      value={doctorForm.name}
                      onChange={(e) =>
                        setDoctorForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      value={doctorForm.email}
                      onChange={(e) =>
                        setDoctorForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      value={doctorForm.phone}
                      onChange={(e) =>
                        setDoctorForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Temporary Password *
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      value={doctorForm.password}
                      onChange={(e) =>
                        setDoctorForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                    />
                    <p className="mt-1 text-[11px] text-[#6b7280]">
                      Minimum 6 characters. The doctor can change this after logging in.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDoctorModal(false)
                      setDoctorError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreateDoctor}
                    disabled={isLoading}
                  >
                    Create Doctor
                  </Button>
                </div>
              </div>
            </Modal>
          </Card>
        )}

        {/* Doctor Schedules Tab */}
        {activeTab === "schedules" && (
          <DoctorAvailabilityManager
            doctors={doctors.map((d) => ({
              id: d.id,
              name: d.name,
              email: d.email,
            }))}
          />
        )}

        {/* Vacant Slots Tab */}
        {activeTab === "slots" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-[#111111] mb-4">
              Vacant Slots Calendar
            </h2>
            <p className="text-xs sm:text-sm text-[#6b7280] mb-5">
              Select any available slot (white) to add a booking. Filled slots appear with patient details.
            </p>
            <VacantSlotCalendar
              onSlotClick={(date, time) => {
                setPrefilledSlot({ date, time })
                setEditingAppointment(null)
                setShowAppointmentModal(true)
              }}
            />
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-[#111111] mb-4">
              Generate Reports
            </h2>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-[#6b7280]">
                  Choose a specific doctor or include all doctors in the report.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs font-medium text-[#4b5563]">
                  <Filter className="w-3 h-3" />
                  <span>Doctor</span>
                </label>
                <select
                  className="border border-[#e4e4e7] rounded-lg px-2 py-1 text-sm bg-white"
                  value={reportDoctorId}
                  onChange={(e) => setReportDoctorId(e.target.value)}
                >
                  {/* Empty value = no filter = all doctors */}
                  <option value="">All doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ReportExport onExport={handleExportReport} isLoading={isLoading} />
          </Card>
        )}

        {/* Appointment Modal */}
        <Modal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setEditingAppointment(null)
            setPrefilledSlot(null)
          }}
          title={editingAppointment ? "Edit Appointment" : "Create New Appointment"}
          size="lg"
        >
          <AppointmentForm
            onSubmit={handleCreateAppointment}
            onCancel={() => {
              setShowAppointmentModal(false)
              setEditingAppointment(null)
              setPrefilledSlot(null)
            }}
            initialData={
              editingAppointment
                ? {
                    date: new Date(editingAppointment.date),
                    time: format(new Date(editingAppointment.date), "HH:mm"),
                    name: getPatientName(editingAppointment),
                    email: getPatientEmail(editingAppointment),
                    phone: getPatientPhone(editingAppointment),
                    service: editingAppointment.service,
                  }
                : prefilledSlot
                ? {
                    date: new Date(prefilledSlot.date),
                    time: prefilledSlot.time,
                    name: "",
                    email: "",
                    phone: "",
                    service: "",
                  }
                : undefined
            }
            isLoading={isLoading}
            allowFilledSelection
            doctors={doctors}
            // Let the system auto‑assign a dentist when none is selected.
            // Admins can optionally pin a specific dentist by selecting one.
            requireDoctor={false}
          />
        </Modal>
      </div>
    </div>
  )
}

