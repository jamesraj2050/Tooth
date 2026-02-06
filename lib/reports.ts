import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { format } from "date-fns"

export interface ReportData {
  date: string
  time: string
  name: string
  phone: string
  email: string
  service: string
  doctor?: string | null
  paymentAmount: number | null
  paymentStatus: string | null
}

export function generateExcelReport(data: ReportData[], filename: string): void {
  // Prepare data for Excel
  const excelData = data.map((row) => ({
    Date: format(new Date(row.date), "MMM d, yyyy"),
    Time: row.time,
    Name: row.name,
    Doctor: row.doctor || "N/A",
    Phone: row.phone,
    Email: row.email,
    Service: row.service,
    "Payment Amount": row.paymentAmount ? `$${Number(row.paymentAmount).toFixed(2)}` : "$0.00",
    "Payment Status": row.paymentStatus || "PENDING",
  }))

  // Add summary row
  const totalAmount = data.reduce(
    (sum, row) => sum + (row.paymentAmount ? Number(row.paymentAmount) : 0),
    0
  )
  const paidCount = data.filter((row) => row.paymentStatus === "PAID").length
  const pendingCount = data.filter((row) => row.paymentStatus === "PENDING" || !row.paymentStatus).length

  excelData.push({} as any) // Empty row
  excelData.push({
    Date: "SUMMARY",
    Time: "",
    Name: "",
    Phone: "",
    Email: "",
    Service: "",
    "Payment Amount": `$${totalAmount.toFixed(2)}`,
    "Payment Status": `Paid: ${paidCount}, Pending: ${pendingCount}`,
  } as any)

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 10 }, // Time
    { wch: 20 }, // Name
    { wch: 18 }, // Doctor
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 20 }, // Service
    { wch: 15 }, // Payment Amount
    { wch: 15 }, // Payment Status
  ]
  ws["!cols"] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, "Report")
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function generatePDFReport(data: ReportData[], filename: string): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(16)
  doc.text("Appointment Report", 14, 15)

  // Date range
  if (data.length > 0) {
    doc.setFontSize(10)
    doc.text(
      `Period: ${format(new Date(data[0].date), "MMM d, yyyy")} - ${format(new Date(data[data.length - 1].date), "MMM d, yyyy")}`,
      14,
      22
    )
  }

  // Prepare table data
  const tableData = data.map((row) => [
    format(new Date(row.date), "MMM d, yyyy"),
    row.time,
    row.name,
    row.doctor || "N/A",
    row.phone,
    row.email,
    row.service,
    row.paymentAmount ? `$${Number(row.paymentAmount).toFixed(2)}` : "$0.00",
    row.paymentStatus || "PENDING",
  ])

  // Add table
  ;(doc as any).autoTable({
    head: [["Date", "Time", "Name", "Doctor", "Phone", "Email", "Service", "Amount", "Status"]],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [245, 245, 247] },
  })

  // Add summary
  const totalAmount = data.reduce(
    (sum, row) => sum + (row.paymentAmount ? Number(row.paymentAmount) : 0),
    0
  )
  const paidCount = data.filter((row) => row.paymentStatus === "PAID").length
  const pendingCount = data.filter((row) => row.paymentStatus === "PENDING" || !row.paymentStatus).length

  const finalY = (doc as any).lastAutoTable.finalY || 28
  doc.setFontSize(10)
  doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 10)
  doc.text(`Paid: ${paidCount} | Pending: ${pendingCount}`, 14, finalY + 16)

  doc.save(`${filename}.pdf`)
}

