import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await setCurrentUserIdForRLS(session.user.id)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const formatType = searchParams.get("format")

    if (!startDate || !endDate || !formatType) {
      return NextResponse.json(
        { error: "startDate, endDate, and format are required" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get appointments treated by this doctor
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ["CANCELLED"],
        },
        doctorId: session.user.id, // Only appointments treated by this doctor
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

    const reportData = appointments.map((apt) => ({
      date: apt.date.toISOString(),
      time: format(new Date(apt.date), "HH:mm"),
      name: apt.patient?.name || apt.patientName || "N/A",
      phone: apt.patient?.phone || apt.patientPhone || "N/A",
      email: apt.patient?.email || apt.patientEmail || "N/A",
      service: apt.service,
      paymentAmount: apt.paymentAmount ? Number(apt.paymentAmount) : null,
      paymentStatus: apt.paymentStatus,
    }))

    const filename = `${type}_report_${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`
    
    if (formatType === "excel") {
      return NextResponse.json({ data: reportData, filename })
    } else {
      const pdfBuffer = await generatePDFBuffer(reportData, filename)
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      })
    }
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    )
  }
}

// Generate PDF and return as ArrayBuffer (Edge-compatible, no Node Buffer)
async function generatePDFBuffer(data: any[], filename: string): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf")
  await import("jspdf-autotable")
  
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text("Doctor Appointment Report", 14, 15)

  if (data.length > 0) {
    doc.setFontSize(10)
    doc.text(
      `Period: ${format(new Date(data[0].date), "MMM d, yyyy")} - ${format(new Date(data[data.length - 1].date), "MMM d, yyyy")}`,
      14,
      22
    )
  }

  const tableData = data.map((row) => [
    format(new Date(row.date), "MMM d, yyyy"),
    row.time,
    row.name,
    row.phone,
    row.email,
    row.service,
    row.paymentAmount ? `$${Number(row.paymentAmount).toFixed(2)}` : "$0.00",
    row.paymentStatus || "PENDING",
  ])

  ;(doc as any).autoTable({
    head: [["Date", "Time", "Name", "Phone", "Email", "Service", "Amount", "Status"]],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [245, 245, 247] },
  })

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

  const pdfOutput = doc.output("arraybuffer") as ArrayBuffer
  return pdfOutput
}

