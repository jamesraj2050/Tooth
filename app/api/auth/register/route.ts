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
    const emailRedirectTo = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/login?verified=true`
      : undefined

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
    let verificationEmailTriggered = false
    let supabaseErrorMessage: string | null = null

    try {
      const supabase = createSupabasePublicClient()

      // Attempt signUp with redirect first (best UX), but retry without it if Supabase rejects the URL.
      let signUpError: { message?: string } | null = null

      {
        const { error } = await supabase.auth.signUp({
          email,
          password: validatedData.password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        })
        signUpError = error ? { message: error.message } : null
      }

      if (signUpError && emailRedirectTo && /redirect|url/i.test(signUpError.message || "")) {
        const { error } = await supabase.auth.signUp({
          email,
          password: validatedData.password,
        })
        signUpError = error ? { message: error.message } : null
      }

      // If the user already exists in Supabase Auth, resend the signup confirmation email.
      if (signUpError && /already|registered|exists/i.test(signUpError.message || "")) {
        let resendError: { message?: string } | null = null
        {
          const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: emailRedirectTo ? { emailRedirectTo } : undefined,
          })
          resendError = error ? { message: error.message } : null
        }

        if (resendError && emailRedirectTo && /redirect|url/i.test(resendError.message || "")) {
          const { error } = await supabase.auth.resend({
            type: "signup",
            email,
          })
          resendError = error ? { message: error.message } : null
        }

        if (resendError) {
          supabaseErrorMessage = resendError.message || "Failed to resend verification email"
        } else {
          verificationEmailTriggered = true
        }
      } else if (signUpError) {
        supabaseErrorMessage = signUpError.message || "Failed to create Supabase Auth user"
      } else {
        verificationEmailTriggered = true
      }
    } catch (e) {
      supabaseErrorMessage = e instanceof Error ? e.message : "Supabase signup failed"
    }

    if (!verificationEmailTriggered) {
      console.error("Supabase verification email not triggered:", {
        email,
        emailRedirectTo,
        error: supabaseErrorMessage,
      })

      // Roll back DB user creation/upgrade so we don't create accounts without verification email.
      try {
        if (!existingUser) {
          await prisma.user.delete({ where: { id: user.id } })
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: existingUser.name,
              phone: existingUser.phone,
              password: existingUser.password,
            },
          })
        }
      } catch (rollbackErr) {
        console.error("Failed to rollback user after Supabase failure:", rollbackErr)
      }

      return NextResponse.json(
        {
          error:
            "Could not send verification email. Please try again in a minute. If the issue continues, contact the clinic.",
          details:
            process.env.NODE_ENV !== "production" ? supabaseErrorMessage : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        needsEmailVerification: true,
        verificationEmailTriggered: true,
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

