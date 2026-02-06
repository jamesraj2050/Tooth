import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"

interface RouteParams {
  params: {
    id: string
  }
}

// DELETE: remove a doctor account (e.g. when a doctor resigns)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await setCurrentUserIdForRLS(session.user.id)

    const doctorId = params.id

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
    })

    if (!doctor || doctor.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      )
    }

    // Deleting the doctor will:
    // - Cascade delete their Availability rows (onDelete: Cascade on Availability.doctor)
    // - Set doctorId to null on related appointments (default onDelete for optional relation)
    await prisma.user.delete({
      where: { id: doctorId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting doctor:", error)
    return NextResponse.json(
      { error: "Failed to delete doctor" },
      { status: 500 }
    )
  }
}


