"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [didPrefill, setDidPrefill] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"" | "success" | "error">("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (didPrefill) return

    const qpEmail = (searchParams.get("email") || "").trim()
    if (qpEmail) {
      setEmail(qpEmail)
      setDidPrefill(true)
      return
    }

    try {
      const stored = (sessionStorage.getItem("reset_prefill_email") || "").trim()
      if (stored) setEmail(stored)
      sessionStorage.removeItem("reset_prefill_email")
    } catch {
      // ignore
    } finally {
      setDidPrefill(true)
    }
  }, [didPrefill, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setMessageType("")
    setIsLoading(true)

    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      // Always show a friendly success message (do not reveal existence).
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}))
        throw new Error(json?.error || "Failed to request password reset.")
      }

      setMessageType("success")
      setMessage(
        "Email sent to reset password. Please check your inbox and spam/trash folder."
      )
    } catch (err) {
      setMessageType("error")
      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again later."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-text-secondary text-sm">
              {"Enter your email and we'll send reset instructions."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={[
                  "p-3 text-sm rounded-apple border",
                  messageType === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : messageType === "error"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-gray-50 border-gray-200 text-text-secondary",
                ].join(" ")}
              >
                {message}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Reset password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

