import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { format } from "date-fns"
import { DoctorDashboardClient } from "./DoctorDashboardClient"

/** Explicit type so the build never hits implicit-any errors. */
type DoctorAppointmentRow = {
  id: string
  date: Date
  service: string
  status: string
  notes: string | null
  paymentAmount: unknown
  paymentStatus: string | null
  treatmentStatus: string
  patientName: string | null
  patientEmail: string | null
  patientPhone: string | null
  patient: { name: string; email: string; phone: string | null } | null
}

export default async function DoctorPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }
  await setCurrentUserIdForRLS(session.user?.id)

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  })

  if (!user || user.role !== "DOCTOR") {
    redirect("/dashboard")
  }

  const appointments: DoctorAppointmentRow[] = await prisma.appointment.findMany({
    where: {
      doctorId: user.id,
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: { date: "asc" },
    include: {
      patient: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayAppointments = appointments.filter(
    (apt: DoctorAppointmentRow) =>
      format(new Date(apt.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  )

  const stats = {
    total: appointments.length,
    today: todayAppointments.length,
    pendingTreatments: appointments.filter(
      (apt: DoctorAppointmentRow) =>
        apt.treatmentStatus === "PENDING" ||
        apt.treatmentStatus === "PARTIAL"
    ).length,
  }

  // Serialize appointments for client component
  const serializedAppointments = appointments.map((apt: DoctorAppointmentRow) => ({
    id: apt.id,
    date: apt.date.toISOString(),
    service: apt.service,
    status: apt.status,
    paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
    paymentStatus: apt.paymentStatus,
    treatmentStatus: apt.treatmentStatus,
    patient: apt.patient,
    patientName: apt.patientName,
    patientEmail: apt.patientEmail,
    patientPhone: apt.patientPhone,
  }))

  return (
    <DoctorDashboardClient
      initialAppointments={serializedAppointments}
      stats={stats}
      doctorName={user.name}
      doctorId={user.id}
    />
  )
}
