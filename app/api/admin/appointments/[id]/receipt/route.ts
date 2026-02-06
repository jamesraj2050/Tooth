import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Receipt download is intentionally disabled for production
    return NextResponse.json(
      { error: "Receipt download is currently disabled." },
      { status: 501 }
    )
  } catch (error) {
    console.error("Error generating receipt:", error)
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 })
  }
}

