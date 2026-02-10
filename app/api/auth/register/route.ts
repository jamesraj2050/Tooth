import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { createSupabasePublicClient } from "@/lib/supabaseServer"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    const email = validatedData.email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // If it's a "guest/placeholder" patient record (no password), allow upgrade via register.
      if (existingUser.role !== "PATIENT" || !!existingUser.password) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create or upgrade user in our DB
    const user = existingUser
      ? await prisma.user.update({
          where: { email },
          data: {
            name: validatedData.name,
            password: hashedPassword,
            phone: validatedData.phone || existingUser.phone || null,
          },
        })
      : await prisma.user.create({
          data: {
            name: validatedData.name,
            email,
            password: hashedPassword,
            phone: validatedData.phone || null,
            role: "PATIENT",
          },
        })

    // Trigger Supabase email verification (patients only).
    // This creates a Supabase Auth user and sends a verification email based on Supabase project settings.
    try {
      const supabase = createSupabasePublicClient()
      const emailRedirectTo = process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/login?verified=true`
        : undefined

      const { error } = await supabase.auth.signUp({
        email,
        password: validatedData.password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })

      // If the user already exists in Supabase Auth, resend the signup confirmation email.
      if (error && /already|registered|exists/i.test(error.message || "")) {
        await supabase.auth.resend({
          type: "signup",
          email,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        })
      }
    } catch {
      // If Supabase is unavailable, still allow registration (don't block).
    }

    return NextResponse.json(
      {
        success: true,
        needsEmailVerification: true,
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error registering user:", error)
    
    // Check if it's a real database connectivity error (Prisma P1001 etc.)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      if (
        errorMessage.includes("can't reach database") ||
        errorMessage.includes("failed to connect") ||
        errorMessage.includes("p1001")
      ) {
        return NextResponse.json(
          { error: "Database connection failed. Please check your DATABASE_URL in .env file." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register user" },
      { status: 500 }
    )
  }
}

