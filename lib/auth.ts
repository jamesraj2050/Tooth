import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { getSupabaseEmailStatusByEmail } from "@/lib/supabaseServer"

// #region agent log
if (typeof process !== 'undefined' && process.versions?.node) {
  fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:7',message:'Initializing NextAuth',data:{hasAuthSecret:!!process.env.AUTH_SECRET,hasDbUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Lazy import Prisma only when authorize is called (in Node.js runtime, not Edge Runtime)
        const { prisma } = await import("./prisma")
        
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          return null
        }

        const { email, password } = parsedCredentials.data

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        // Check if user has a password (guest users might not)
        if (!user.password) {
          return null
        }

        // Patients must have verified email (via Supabase) before logging in.
        // Legacy patient accounts without a Supabase Auth user are not blocked.
        if (user.role === "PATIENT") {
          try {
            const supa = await getSupabaseEmailStatusByEmail(email)
            if (supa.supabaseUserExists && !supa.emailConfirmed) {
              return null
            }
          } catch {
            // If Supabase is temporarily unavailable, don't block login.
          }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Include phone so it can be used in the booking form after sign in
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || "",
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
        // Persist phone in JWT so it is available in session on the client
        ;(token as any).phone = (user as any).phone || ""
      }

      // Backfill phone for existing sessions (token may predate phone support)
      // or when phone was updated after login.
      if (!(token as any).phone && token.email) {
        try {
          const { prisma } = await import("./prisma")
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { phone: true },
          })
          ;(token as any).phone = dbUser?.phone || ""
        } catch {
          // ignore
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        // Extend session.user with our custom fields from the JWT
        // @ts-ignore
        session.user.id = token.id
        // @ts-ignore
        session.user.role = token.role
        // @ts-ignore
        session.user.phone = (token as any).phone || ""
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})

