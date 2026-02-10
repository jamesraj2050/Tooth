import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSupabaseEmailStatusByEmail } from "@/lib/supabaseServer"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const emailRaw = (searchParams.get("email") || "").trim()
  const email = emailRaw.toLowerCase()

  if (!emailRaw) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { role: true, password: true },
  })

  if (!user) {
    return NextResponse.json({
      exists: false,
      hasPassword: false,
      verified: false,
    })
  }

  const hasPassword = !!user.password

  // Email verification applies to PATIENT only.
  if (user.role !== "PATIENT") {
    return NextResponse.json({
      exists: true,
      hasPassword,
      verified: true,
    })
  }

  // If the account doesn't have a password yet (guest/placeholder user), treat as not registered.
  if (!hasPassword) {
    return NextResponse.json({
      exists: false,
      hasPassword: false,
      verified: false,
    })
  }

  try {
    const supa = await getSupabaseEmailStatusByEmail(email)

    // If no Supabase Auth user exists (legacy patient accounts), don't block login.
    if (!supa.supabaseUserExists) {
      return NextResponse.json({
        exists: true,
        hasPassword: true,
        verified: true,
      })
    }

    return NextResponse.json({
      exists: true,
      hasPassword: true,
      verified: supa.emailConfirmed,
    })
  } catch (e) {
    // If Supabase is temporarily unavailable, do not block login.
    return NextResponse.json({
      exists: true,
      hasPassword: true,
      verified: true,
    })
  }
}

