import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabasePublicClient } from "@/lib/supabaseServer"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    const supabase = createSupabasePublicClient()
    const emailRedirectTo = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/login?verified=true`
      : undefined

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
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
      { error: error instanceof Error ? error.message : "Failed to resend email" },
      { status: 500 }
    )
  }
}

