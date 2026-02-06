import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get("email") || ""

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error("Error checking user existence:", error)
    return NextResponse.json({ error: "Failed to check user" }, { status: 500 })
  }
}

