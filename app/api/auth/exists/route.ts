import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const emailRaw = (url.searchParams.get("email") || "").trim()
    const email = emailRaw.toLowerCase()

    if (!emailRaw) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true, password: true },
    })

    // Treat placeholder users (no password yet) as non-existing for login UX.
    return NextResponse.json({ exists: !!user && !!user.password })
  } catch (error) {
    console.error("Error checking user existence:", error)
    return NextResponse.json({ error: "Failed to check user" }, { status: 500 })
  }
}

