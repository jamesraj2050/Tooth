"use client"

import { useEffect, useMemo, useState } from "react"
import { format, startOfDay } from "date-fns"
import { Calendar, ClipboardList, Clock } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { AppointmentForm, AppointmentFormData } from "@/components/admin/AppointmentForm"
import { ReportExport } from "@/components/admin/ReportExport"
import { PaymentForm, PaymentFormData } from "@/components/doctor/PaymentForm"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  date: string
  service: string
  status: string
  paymentAmount: number | null
  paymentStatus: string | null
  treatmentStatus: string | null
  patient: {
    name: string
    email: string
    phone: string | null
  } | null
  patientName: string | null
  patientEmail: string | null
  patientPhone: string | null
}

type PaymentDraft = {
  amount: string
  treatmentStatus: "PENDING" | "PARTIAL" | "COMPLETED"
}

interface DoctorDashboardClientProps {
  initialAppointments: Appointment[]
  stats: {
    total: number
    today: number
    pendingTreatments: number
  }
  doctorName: string
  doctorId: string
}

export const DoctorDashboardClient: React.FC<DoctorDashboardClientProps> = ({
  initialAppointments,
  stats,
  doctorName,
  doctorId,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [activeTab, setActiveTab] = useState<"appointments" | "reports">("appointments")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [repeatPrefill, setRepeatPrefill] = useState<Partial<AppointmentFormData> | null>(null)
  const [repeatSourceAppointment, setRepeatSourceAppointment] = useState<Appointment | null>(null)
  const [repeatCreatedAt, setRepeatCreatedAt] = useState<string | null>(null)
  const [showRepeatSuccessModal, setShowRepeatSuccessModal] = useState(false)
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({})
  const [repeatDoneByAppointmentId, setRepeatDoneByAppointmentId] = useState<Record<string, boolean>>({})
  const [showPast, setShowPast] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const todayStart = startOfDay(new Date())

  const firstName = useMemo(() => {
    if (!doctorName) return "Doctor"
    const trimmed = doctorName.trim()
    const parts = trimmed.split(" ")
    // If the name already starts with Dr/Doctor, keep as is
    if (/^dr\.?/i.test(parts[0]) || /^doctor$/i.test(parts[0])) {
      return trimmed.replace(/^Dr\.?\s*/i, "").split(" ")[0]
    }
    return parts[0]
  }, [doctorName])

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [appointments]
  )

  const upcomingAppointments = sortedAppointments.filter(
    (apt) => new Date(apt.date) >= todayStart
  )
  const pastAppointments = sortedAppointments.filter(
    (apt) => new Date(apt.date) < todayStart
  )

  const displayedAppointments = showPast
    ? [...upcomingAppointments, ...pastAppointments]
    : upcomingAppointments

  const handleCreateAppointment = async (form: AppointmentFormData) => {
    setIsLoading(true)
    try {
      if (!form.date || !form.time) {
        throw new Error("Date and time are required")
      }

      // Format date as YYYY-MM-DD in *local time* (avoid UTC shift)
      const dateStr = form.date ? format(form.date, "yyyy-MM-dd") : ""
      
      const response = await fetch("/api/doctor/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: dateStr, // Send as YYYY-MM-DD string
          time: form.time, // Keep time as HH:mm string
        }),
      })

      if (response.ok) {
        const { appointment } = await response.json()
        setAppointments((prev) => [
          ...prev,
          {
            ...appointment,
            paymentAmount: appointment.paymentAmount
              ? Number(appointment.paymentAmount)
              : null,
          },
        ])
        setShowAppointmentModal(false)
        setRepeatPrefill(null)

        // If this was created via "Repeat appointment", show confirmation and return to payment modal.
        if (repeatSourceAppointment) {
          setRepeatCreatedAt(appointment?.date ?? null)
          setRepeatDoneByAppointmentId((prev) => ({
            ...prev,
            [repeatSourceAppointment.id]: true,
          }))
          setShowRepeatSuccessModal(true)
        }
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

  const handleUpdatePayment = async (data: PaymentFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/doctor/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const { appointment } = await response.json()
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointment.id
              ? {
                  ...apt,
                  paymentAmount: appointment.paymentAmount
                    ? Number(appointment.paymentAmount)
                    : null,
                  paymentStatus: appointment.paymentStatus,
                  treatmentStatus: appointment.treatmentStatus,
                }
              : apt
          )
        )
        setShowPaymentModal(false)
        setSelectedAppointment(null)
      } else {
        const error = await response.json()
        const errorMessage = error.details 
          ? `${error.error || "Failed to update treatment"}\n\nDetails: ${error.details}`
          : error.error || "Failed to update treatment"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error updating treatment:", error)
      alert("Failed to update treatment")
    } finally {
      setIsLoading(false)
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
        const response = await fetch(
          `/api/doctor/appointments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        if (response.ok) {
          const { appointments } = await response.json()
          const reportData = appointments.map((apt: any) => ({
            date: apt.date,
            time: format(new Date(apt.date), "HH:mm"),
            name: apt.patient?.name || apt.patientName || "N/A",
            phone: apt.patient?.phone || apt.patientPhone || "N/A",
            email: apt.patient?.email || apt.patientEmail || "N/A",
            service: apt.service,
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
        const response = await fetch(
          `/api/doctor/reports?type=${type}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&format=${formatType}`
        )
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

  const getPatientName = (apt: Appointment) => apt.patient?.name || apt.patientName || "N/A"
  const getPatientEmail = (apt: Appointment) => apt.patient?.email || apt.patientEmail || "N/A"
  const getPatientPhone = (apt: Appointment) => apt.patient?.phone || apt.patientPhone || "N/A"

  const getTreatmentBadgeClass = (status: string | null) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 border border-green-200"
      case "PARTIAL":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200"
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200"
    }
  }

  const getPaymentBadgeClass = (status: string | null) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700"
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-700"
      default:
        return "bg-red-100 text-red-700"
    }
  }

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

  // Refresh appointments from server (doctor's own appointments)
  const refreshAppointments = async () => {
    try {
      const response = await fetch("/api/doctor/appointments")
      if (!response.ok) return

      const { appointments } = await response.json()
      setAppointments(
        (appointments || []).map((apt: any) => ({
          ...apt,
          date: apt.date,
          paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
        }))
      )
    } catch (error) {
      console.error("Error refreshing doctor appointments:", error)
    }
  }

  useEffect(() => {
    if (activeTab !== "appointments") return

    let cancelled = false

    // Initial refresh when tab becomes active
    refreshAppointments()

    const intervalId = setInterval(() => {
      if (!cancelled) {
        refreshAppointments()
      }
    }, 30000) // 30 seconds

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [activeTab])

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-6 sm:py-8 text-[#111827]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#111111] mb-1 tracking-tight">
            Dr {firstName}&apos;s Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[#4b5563]">
            Today’s schedule and upcoming treatments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { label: "Total", value: stats.total, icon: Calendar },
            { label: "Today", value: stats.today, icon: Clock },
            { label: "Pending Care", value: stats.pendingTreatments, icon: ClipboardList },
          ].map((card) => (
            <Card key={card.label} className="bg-white border border-[#e4e4e7] shadow-sm">
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
          ))}
        </div>

        <div className="mb-6 border-b border-[#e4e4e7]">
          <div className="flex gap-3 text-sm font-medium">
            <button
              onClick={() => setActiveTab("appointments")}
              className={cn(
                "pb-3 px-1 transition-colors border-b-2",
                activeTab === "appointments"
                  ? "border-[#111111] text-[#111111]"
                  : "border-transparent text-[#6b7280] hover:text-[#111111]"
              )}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={cn(
                "pb-3 px-1 transition-colors border-b-2",
                activeTab === "reports"
                  ? "border-[#111111] text-[#111111]"
                  : "border-transparent text-[#6b7280] hover:text-[#111111]"
              )}
            >
              Reports
            </button>
          </div>
        </div>

        {activeTab === "appointments" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-[#111111] tracking-tight">
                  Current & Upcoming
                </h2>
                <p className="text-xs text-[#6b7280]">
                  Toggle to view previous visits or add follow-up bookings.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPast((prev) => !prev)}
                  className="text-xs border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                >
                  {showPast ? "Hide Previous" : "Show Previous"}
                </Button>
              </div>
            </div>

            {displayedAppointments.length === 0 ? (
              <div className="text-center py-12 text-[#6b7280]">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No appointments in this view</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] text-xs uppercase tracking-wide text-[#6b7280] bg-[#f4f4f5]">
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Time</th>
                      <th className="text-left py-3 px-4 font-semibold">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold">Service</th>
                      <th className="text-left py-3 px-4 font-semibold">Treatment</th>
                      <th className="text-left py-3 px-4 font-semibold">Payment</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-[#f1f1f3] hover:bg-[#f9fafb] transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-[#111111]">
                          {format(new Date(appointment.date), "MMM d, yyyy")}
                        </td>
                        <td className="py-4 px-4 text-[#111111]">
                          {format(new Date(appointment.date), "h:mm a")}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-[#111111]">
                            {getPatientName(appointment)}
                          </p>
                          <p className="text-xs text-[#6b7280]">{getPatientEmail(appointment)}</p>
                          <p className="text-xs text-[#6b7280]">{getPatientPhone(appointment)}</p>
                        </td>
                        <td className="py-4 px-4 text-[#111111]">{appointment.service}</td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1",
                              getTreatmentBadgeClass(appointment.treatmentStatus || "PENDING")
                            )}
                          >
                            {appointment.treatmentStatus || "PENDING"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <p className="font-medium text-[#111111]">
                              {formatPaymentAmount(
                                appointment.paymentAmount ? Number(appointment.paymentAmount) : null
                              )}
                            </p>
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold",
                                getPaymentBadgeClass(appointment.paymentStatus)
                              )}
                            >
                              {appointment.paymentStatus || "PENDING"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                            onClick={() => {
                              setSelectedAppointment(appointment)
                              setShowPaymentModal(true)
                            }}
                          >
                            Update Status
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "reports" && (
          <Card variant="elevated" className="p-4 sm:p-6 bg-white border border-[#e4e4e7] shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-[#111111] mb-4">
              Download Weekly / Monthly Reports
            </h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Export PDF or CSV summaries for your personal records.
            </p>
            <ReportExport onExport={handleExportReport} isLoading={isLoading} />
          </Card>
        )}

        {selectedAppointment && (
          <Modal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedAppointment(null)
            }}
            title="Update Treatment & Charges"
            size="md"
          >
            <PaymentForm
              appointmentId={selectedAppointment.id}
              patientName={getPatientName(selectedAppointment)}
              currentAmount={selectedAppointment.paymentAmount || undefined}
              currentTreatmentStatus={
                (selectedAppointment.treatmentStatus as "PENDING" | "PARTIAL" | "COMPLETED") ||
                "PENDING"
              }
              draftAmount={paymentDrafts[selectedAppointment.id]?.amount}
              onDraftAmountChange={(value) =>
                setPaymentDrafts((prev) => ({
                  ...prev,
                  [selectedAppointment.id]: {
                    amount: value,
                    treatmentStatus:
                      prev[selectedAppointment.id]?.treatmentStatus ||
                      ((selectedAppointment.treatmentStatus as any) ?? "PENDING"),
                  },
                }))
              }
              draftTreatmentStatus={paymentDrafts[selectedAppointment.id]?.treatmentStatus}
              onDraftTreatmentStatusChange={(value) =>
                setPaymentDrafts((prev) => ({
                  ...prev,
                  [selectedAppointment.id]: {
                    amount: prev[selectedAppointment.id]?.amount ?? (selectedAppointment.paymentAmount?.toString() ?? ""),
                    treatmentStatus: value,
                  },
                }))
              }
              repeatDone={!!repeatDoneByAppointmentId[selectedAppointment.id]}
              onRepeatAppointment={() => {
                setRepeatPrefill({
                  date: null,
                  time: null,
                  name: getPatientName(selectedAppointment),
                  email: getPatientEmail(selectedAppointment),
                  phone: getPatientPhone(selectedAppointment),
                  service: selectedAppointment.service,
                  notes: "",
                })
                setRepeatSourceAppointment(selectedAppointment)
                setShowPaymentModal(false)
                setSelectedAppointment(null)
                setShowAppointmentModal(true)
              }}
              onSubmit={handleUpdatePayment}
              onCancel={() => {
                setShowPaymentModal(false)
                setSelectedAppointment(null)
              }}
              isLoading={isLoading}
            />
          </Modal>
        )}

        <Modal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setRepeatPrefill(null)
            setRepeatSourceAppointment(null)
          }}
          title="Add Follow-up Appointment"
          size="lg"
        >
          <AppointmentForm
            onSubmit={handleCreateAppointment}
            onCancel={() => {
              setShowAppointmentModal(false)
              setRepeatPrefill(null)
              setRepeatSourceAppointment(null)
            }}
            isLoading={isLoading}
            allowFilledSelection={false}
            defaultDoctorId={doctorId}
            initialData={repeatPrefill ?? undefined}
          />
        </Modal>

        <Modal
          isOpen={showRepeatSuccessModal}
          onClose={() => {
            setShowRepeatSuccessModal(false)
            setRepeatCreatedAt(null)
            setRepeatSourceAppointment(null)
          }}
          title="Repeat appointment booked"
          size="md"
        >
          <div className="space-y-5">
            <p className="text-sm text-[#4b5563]">
              Next booking scheduled for{" "}
              <span className="font-semibold text-[#111111]">
                {repeatCreatedAt ? format(new Date(repeatCreatedAt), "MMM d, yyyy 'at' h:mm a") : "—"}
              </span>
              .
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setShowRepeatSuccessModal(false)
                  setRepeatCreatedAt(null)
                  if (repeatSourceAppointment) {
                    setSelectedAppointment(repeatSourceAppointment)
                    setShowPaymentModal(true)
                  }
                  setRepeatSourceAppointment(null)
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
