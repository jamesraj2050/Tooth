import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const paymentSchema = z.object({
  appointmentId: z.string(),
  amount: z.number().min(0),
  treatmentStatus: z.enum(["PENDING", "PARTIAL", "COMPLETED"]),
})

// POST: Update payment for appointment
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await setCurrentUserIdForRLS(session.user.id)

    const body = await request.json()
    const validatedData = paymentSchema.parse(body)

    // Validate user ID exists
    if (!session.user.id) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      )
    }

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      )
    }

    // Update appointment with amount and treatment status
    // (paymentStatus itself is controlled separately by Admin)
    // Use Prisma.Decimal for proper Decimal type handling
    const updatedAppointment = await prisma.appointment.update({
      where: { id: validatedData.appointmentId },
      data: {
        paymentAmount: new Prisma.Decimal(validatedData.amount),
        treatmentStatus: validatedData.treatmentStatus,
        doctorId: session.user.id,
      },
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

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating payment:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    // Strip ANSI escape codes from error message
    const cleanErrorMessage = errorMessage.replace(/\x1b\[[0-9;]*m/g, '')
    return NextResponse.json(
      { error: "Failed to update payment", details: cleanErrorMessage },
      { status: 500 }
    )
  }
}

