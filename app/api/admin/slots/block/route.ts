import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, setCurrentUserIdForRLS } from "@/lib/prisma"

type BlockAction = "block" | "unblock"

interface BlockPayload {
  action: BlockAction
  slots: { date: string; time: string }[]
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await setCurrentUserIdForRLS(session.user.id)

    const body = (await request.json()) as BlockPayload
    const { action, slots, reason } = body

    if (!action || !["block", "unblock"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Expected 'block' or 'unblock'." },
        { status: 400 }
      )
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: "No slots provided to update." },
        { status: 400 }
      )
    }

    // Normalize and validate dates
    const dateTimes = slots.map((s) => {
      const iso = `${s.date}T${s.time}:00`
      const dt = new Date(iso)
      if (isNaN(dt.getTime())) {
        throw new Error(`Invalid date/time: ${s.date} ${s.time}`)
      }
      return dt
    })

    if (action === "block") {
      // Create blocked entries for each requested slot (duplicates are harmless)
      await prisma.blockedSlot.createMany({
        data: dateTimes.map((dt) => ({
          date: dt,
          reason: reason ?? "Blocked",
        })),
        skipDuplicates: true,
      })
    } else {
      // Unblock: delete any BlockedSlot rows that match these exact timestamps
      await prisma.blockedSlot.deleteMany({
        where: {
          date: { in: dateTimes },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating blocked slots:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update blocked slots" },
      { status: 500 }
    )
  }
}


