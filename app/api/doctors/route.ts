import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint: list available doctors for booking
export async function GET() {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ doctors })
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return NextResponse.json(
      { error: "Failed to load doctors" },
      { status: 500 }
    )
  }
}


