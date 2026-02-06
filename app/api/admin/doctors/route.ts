import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createDoctorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
})

// GET: list doctors for admin
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await setCurrentUserIdForRLS(session.user.id)

    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
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

// POST: create a new doctor (max 5)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await setCurrentUserIdForRLS(session.user.id)

    const body = await request.json()
    const data = createDoctorSchema.parse(body)

    // Enforce max 5 doctors
    const doctorCount = await prisma.user.count({
      where: { role: "DOCTOR" },
    })
    if (doctorCount >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 doctor logins allowed" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const doctor = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        password: hashedPassword,
        role: "DOCTOR",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ doctor }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating doctor:", error)
    return NextResponse.json(
      { error: "Failed to create doctor" },
      { status: 500 }
    )
  }
}


