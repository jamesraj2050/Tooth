import nodemailer from "nodemailer"
import { format } from "date-fns"

type AppointmentEmailDetails = {
  toEmail: string
  patientName: string
  patientPhone?: string | null
  service: string
  appointmentDate: Date
  doctorName?: string | null
  notes?: string | null
}

function getEnv(name: string) {
  return process.env[name]
}

function requiredEnv(name: string) {
  const v = getEnv(name)
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

let cachedTransport: nodemailer.Transporter | null = null

function getTransport() {
  if (cachedTransport) return cachedTransport

  const host = requiredEnv("SMTP_HOST")
  const port = Number(getEnv("SMTP_PORT") || "587")
  const user = requiredEnv("SMTP_USER")
  const pass = requiredEnv("SMTP_PASS")
  const secureEnv = (getEnv("SMTP_SECURE") || "").trim().toLowerCase()
  // If SMTP_SECURE is not set, choose a safe default based on port.
  // (465 = implicit TLS, 587 = STARTTLS)
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  return cachedTransport
}

function getFromAddress() {
  return (
    getEnv("EMAIL_FROM") ||
    getEnv("SMTP_FROM") ||
    "Tooth Oral Care Centre <no-reply@tooth.local>"
  )
}

export async function sendAppointmentConfirmedEmail(details: AppointmentEmailDetails) {
  const from = getFromAddress()
  const subject = "Appointment confirmed - Tooth Oral Care Centre"

  const dateStr = format(details.appointmentDate, "dd MMM yyyy")
  const timeStr = format(details.appointmentDate, "hh:mm a")

  const text = [
    `Hi, Your appointment with Tooth Oral Care Centre is confirmed as per details below`,
    ``,
    `Patient: ${details.patientName}`,
    `Service: ${details.service}`,
    `Date: ${dateStr}`,
    `Time: ${timeStr}`,
    `Doctor: ${details.doctorName || "To be assigned"}`,
    `Phone: ${details.patientPhone || "-"}`,
    details.notes ? `Notes: ${details.notes}` : null,
    ``,
    `Thank you,`,
    `Tooth Oral Care Centre`,
  ]
    .filter(Boolean)
    .join("\n")

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5">
      <p><strong>Hi, Your appointment with Tooth Oral Care Centre is confirmed as per details below</strong></p>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-top: 8px">
        <tr><td><strong>Patient</strong></td><td>${escapeHtml(details.patientName)}</td></tr>
        <tr><td><strong>Service</strong></td><td>${escapeHtml(details.service)}</td></tr>
        <tr><td><strong>Date</strong></td><td>${escapeHtml(dateStr)}</td></tr>
        <tr><td><strong>Time</strong></td><td>${escapeHtml(timeStr)}</td></tr>
        <tr><td><strong>Doctor</strong></td><td>${escapeHtml(details.doctorName || "To be assigned")}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(details.patientPhone || "-")}</td></tr>
        ${
          details.notes
            ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(details.notes)}</td></tr>`
            : ""
        }
      </table>
      <p style="margin-top: 16px">Thank you,<br/>Tooth Oral Care Centre</p>
    </div>
  `

  const transport = getTransport()
  await transport.sendMail({
    from,
    to: details.toEmail,
    subject,
    text,
    html,
  })
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

