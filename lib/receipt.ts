import jsPDF from "jspdf"
import { format } from "date-fns"

export interface ReceiptDetails {
  clinicName: string
  clinicPhone?: string
  clinicEmail?: string
  patientName: string
  service: string
  amount: number
  appointmentDate: Date
  paymentDate: Date
  issuedBy: string
}

export function buildReceiptPdf(details: ReceiptDetails): Uint8Array {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(details.clinicName, 14, 18)
  doc.setFontSize(10)
  if (details.clinicPhone) {
    doc.text(`Phone: ${details.clinicPhone}`, 14, 24)
  }
  if (details.clinicEmail) {
    doc.text(`Email: ${details.clinicEmail}`, 14, 30)
  }

  doc.setFontSize(14)
  doc.text("Payment Receipt", 150, 18, { align: "right" })

  doc.setFontSize(10)
  doc.text(`Receipt Date: ${format(details.paymentDate, "MMM d, yyyy")}`, 150, 24, {
    align: "right",
  })
  doc.text(`Appointment: ${format(details.appointmentDate, "MMM d, yyyy h:mm a")}`, 150, 30, {
    align: "right",
  })

  doc.setLineWidth(0.4)
  doc.line(14, 36, 196, 36)

  const bodyStartY = 44
  doc.setFontSize(12)
  doc.text("Patient", 14, bodyStartY)
  doc.setFontSize(10)
  doc.text(details.patientName, 14, bodyStartY + 6)

  doc.setFontSize(12)
  doc.text("Service", 14, bodyStartY + 18)
  doc.setFontSize(10)
  doc.text(details.service, 14, bodyStartY + 24)

  doc.setFontSize(12)
  doc.text("Amount", 14, bodyStartY + 36)
  doc.setFontSize(16)
  doc.text(`$${details.amount.toFixed(2)}`, 14, bodyStartY + 46)

  doc.setFontSize(10)
  doc.text(`Issued By: ${details.issuedBy}`, 14, bodyStartY + 60)

  const arrayBuffer = doc.output("arraybuffer")
  return new Uint8Array(arrayBuffer)
}

