import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { format } from "date-fns"
import { AdminDashboardClient } from "./AdminDashboardClient"

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  await setCurrentUserIdForRLS(session.user?.id)

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  })

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const appointments = await prisma.appointment.findMany({
    orderBy: { date: "asc" },
    include: {
      patient: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      doctor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  const today = new Date()
  const todayAppointments = appointments.filter(
    (apt) =>
      format(new Date(apt.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
  )

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.date) >= today && apt.status !== "CANCELLED"
  )

  const stats = {
    total: appointments.length,
    today: todayAppointments.length,
    upcoming: upcomingAppointments.length,
    patients: new Set(
      appointments
        .map((apt) => apt.patientId || apt.patientEmail)
        .filter(Boolean)
    ).size,
  }

  // Serialize appointments for client component
  const serializedAppointments = appointments.map((apt) => ({
    id: apt.id,
    date: apt.date.toISOString(),
    service: apt.service,
    status: apt.status,
    paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
    paymentStatus: apt.paymentStatus,
    treatmentStatus: apt.treatmentStatus,
    createdBy: apt.createdBy,
    adminConfirmed: apt.adminConfirmed,
    patient: apt.patient,
    patientName: apt.patientName,
    patientEmail: apt.patientEmail,
    patientPhone: apt.patientPhone,
    doctor: apt.doctor,
  }))

  return (
    <AdminDashboardClient
      initialAppointments={serializedAppointments}
      stats={stats}
    />
  )
}

