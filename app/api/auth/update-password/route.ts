import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/supabaseServer"

const schema = z.object({
  accessToken: z.string().min(10),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, password } = schema.parse(body)

    // Validate the Supabase recovery token and retrieve the user email/id.
    const supabase = createSupabasePublicClient()
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)

    if (userError || !userData?.user?.email || !userData.user.id) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link. Please request a new one." },
        { status: 401 }
      )
    }

    const email = userData.user.email.toLowerCase()
    const supabaseUserId = userData.user.id

    // Update password in our app DB (NextAuth credentials uses this).
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })

    // Keep Supabase Auth password in sync (optional but helpful).
    try {
      const admin = createSupabaseAdminClient()
      await admin.auth.admin.updateUserById(supabaseUserId, {
        password,
      })
    } catch {
      // ignore - app login still works via Prisma password
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update password" },
      { status: 500 }
    )
  }
}

