 "use client"

import { useState } from "react"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setIsLoading(true)

    try {
      // Placeholder behavior: we don't have a full reset email system implemented yet.
      // For now we accept the request and show a friendly message.
      await fetch("/api/auth/exists?email=" + encodeURIComponent(email))
      setMessage(
        "If an account with that email exists, you will receive password reset instructions (not implemented in this demo). Please contact the clinic if you need help."
      )
    } catch (err) {
      setMessage("Failed to submit request. Please try again later.")
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
            <p className="text-text-secondary text-sm">Enter your email and we'll send reset instructions.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && <div className="p-3 text-sm text-text-secondary">{message}</div>}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset instructions"}
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

