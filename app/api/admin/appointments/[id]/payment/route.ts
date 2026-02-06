import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL"]).default("PAID"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { paymentStatus } = updateSchema.parse(body)

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        paymentStatus,
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

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }
    console.error("Error updating payment status:", error)
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 })
  }
}

