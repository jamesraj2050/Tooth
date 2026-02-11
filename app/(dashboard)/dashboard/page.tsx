import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Calendar, Clock, X } from "lucide-react"
import Link from "next/link"
import { format, startOfDay } from "date-fns"
import { CancelAppointmentButton } from "./CancelAppointmentButton"

/** Explicit appointment type so Vercel build never hits implicit-any. */
type PatientAppointmentRow = {
  id: string
  date: Date
  service: string
  status: string
  notes: string | null
  adminConfirmed: boolean
  doctor: { name: string | null; email: string | null } | null
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  await setCurrentUserIdForRLS(session.user?.id)

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
    include: {
      appointments: {
        orderBy: { date: "asc" },
        take: 50,
        include: {
          doctor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Redirect non-patient roles to their specific dashboards
  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  if (user.role === "DOCTOR") {
    redirect("/doctor")
  }

  const todayStart = startOfDay(new Date())

  const appointments: PatientAppointmentRow[] = user.appointments as PatientAppointmentRow[]

  const upcomingAppointments = appointments
    .filter(
      (apt: PatientAppointmentRow) =>
        new Date(apt.date) >= todayStart &&
        apt.status !== "CANCELLED" &&
        apt.status !== "COMPLETED"
    )
    .sort((a: PatientAppointmentRow, b: PatientAppointmentRow) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const currentAppointment = upcomingAppointments[0]
  const otherUpcomingAppointments = upcomingAppointments.slice(1)

  const pastAppointments = appointments.filter(
    (apt: PatientAppointmentRow) =>
      new Date(apt.date) < todayStart ||
      apt.status === "CANCELLED" ||
      apt.status === "COMPLETED"
  )

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1d1d1f] mb-1 tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-base sm:text-lg text-[#86868b] font-normal">
            Manage your appointments and profile
          </p>
        </div>

        {/* Current Appointment Card */}
        {currentAppointment ? (
          <Card variant="elevated" className="mb-6 sm:mb-8 p-6 sm:p-8 bg-gradient-to-br from-[#1E40AF]/5 via-white to-[#1E40AF]/5 border-2 border-[#1E40AF]/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-12 h-12 bg-[#1E40AF] rounded-full flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">
                        Current Appointment
                      </h2>
                      {currentAppointment.adminConfirmed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          Confirmed
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[#86868b]">Your upcoming visit</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  <div className="p-4 bg-white/50 rounded-xl border border-[#e5e5ea]">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Service</p>
                    <p className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                      {currentAppointment.service}
                    </p>
                  </div>
                  <div className="p-4 bg-white/50 rounded-xl border border-[#e5e5ea]">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Date</p>
                    <p className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                      {format(new Date(currentAppointment.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="p-4 bg-white/50 rounded-xl border border-[#e5e5ea]">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Time</p>
                    <p className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                      {format(new Date(currentAppointment.date), "h:mm a")}
                    </p>
                  </div>
                  <div className="p-4 bg-white/50 rounded-xl border border-[#e5e5ea]">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Dentist</p>
                    <p className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                      {currentAppointment.doctor?.name ||
                        currentAppointment.doctor?.email ||
                        "To be assigned"}
                    </p>
                  </div>
                </div>

                {currentAppointment.notes && (
                  <div className="mt-4 sm:mt-6 p-4 bg-white/50 rounded-xl border border-[#e5e5ea]">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Notes</p>
                    <p className="text-sm sm:text-base text-[#1d1d1f]">{currentAppointment.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="w-full sm:w-auto sm:ml-6">
                <CancelAppointmentButton appointmentId={currentAppointment.id} />
              </div>
            </div>
          </Card>
        ) : (
          <Card variant="elevated" className="mb-6 sm:mb-8 p-6 sm:p-8 text-center bg-gradient-to-br from-[#f5f5f7] to-white border-2 border-[#e5e5ea]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1E40AF]/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-[#1E40AF] opacity-60" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] mb-2">
              No Current Appointment
            </h3>
            <p className="text-base sm:text-lg text-[#86868b] mb-6 sm:mb-8">
              Book your next appointment to get started
            </p>
            <Link href="/book">
              <Button variant="primary" size="lg" className="transform hover:scale-105 transition-all duration-300">
                Book Appointment
              </Button>
            </Link>
          </Card>
        )}

        {/* If data already contains multiple upcoming appointments, show them so the patient can cancel extras. */}
        {otherUpcomingAppointments.length > 0 && (
          <Card variant="elevated" className="mb-6 sm:mb-8 p-6 sm:p-8 border border-[#e5e5ea]">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">
                Other Upcoming Appointments
              </h2>
              <p className="text-sm text-[#86868b] mt-1">
                Only one active appointment is allowed. Please cancel any extra bookings.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {otherUpcomingAppointments.map((appointment: PatientAppointmentRow) => (
                <div
                  key={appointment.id}
                  className="p-4 sm:p-6 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                        <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                          {appointment.service}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium w-fit bg-blue-100 text-blue-700">
                            {appointment.status}
                          </span>
                          {appointment.adminConfirmed ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              Confirmed
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Date</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {format(new Date(appointment.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Time</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {format(new Date(appointment.date), "h:mm a")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Dentist</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {appointment.doctor?.name || appointment.doctor?.email || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      <CancelAppointmentButton appointmentId={appointment.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <Card variant="elevated" className="p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] mb-4 sm:mb-6">
              Appointment History
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {pastAppointments.map((appointment: PatientAppointmentRow) => (
                <div
                  key={appointment.id}
                  className="p-4 sm:p-6 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                        <h3 className="text-base sm:text-lg font-semibold text-[#1d1d1f]">
                          {appointment.service}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium w-fit ${
                            appointment.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : appointment.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Date</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {format(new Date(appointment.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Time</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {format(new Date(appointment.date), "h:mm a")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#86868b] text-xs sm:text-sm mb-1">Dentist</p>
                          <p className="text-[#1d1d1f] font-medium text-sm sm:text-base">
                            {appointment.doctor?.name ||
                              appointment.doctor?.email ||
                              "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
