"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

function getQueryParam(name: string) {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get(name) || ""
}

function getHashParam(name: string) {
  if (typeof window === "undefined") return ""
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hash)
  return params.get(name) || ""
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"" | "success" | "error">("")
  const [isLoading, setIsLoading] = useState(false)
  const [recoveryAccessToken, setRecoveryAccessToken] = useState("")

  const code = useMemo(() => getQueryParam("code"), [])
  const accessTokenFromHash = useMemo(() => getHashParam("access_token"), [])
  const refreshTokenFromHash = useMemo(() => getHashParam("refresh_token"), [])
  const type = useMemo(() => getHashParam("type"), [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setMessage("")
      setMessageType("")

      // Support BOTH Supabase recovery formats:
      // - Legacy implicit flow:  /update-password#access_token=...&refresh_token=...&type=recovery
      // - Newer PKCE flow:      /update-password?code=...
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

        if (!url || !anon) {
          setMessageType("error")
          setMessage("Missing Supabase environment variables. Please contact support.")
          return
        }

        const supabase = createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error || !data?.session?.access_token) {
            setMessageType("error")
            setMessage("Invalid or expired password reset link. Please request a new one.")
            return
          }

          if (!cancelled) setRecoveryAccessToken(data.session.access_token)
          return
        }

        if (accessTokenFromHash) {
          if (type && type !== "recovery") {
            setMessageType("error")
            setMessage("Invalid or expired password reset link. Please request a new one.")
            return
          }

          if (refreshTokenFromHash) {
            await supabase.auth.setSession({
              access_token: accessTokenFromHash,
              refresh_token: refreshTokenFromHash,
            })
          }

          if (!cancelled) setRecoveryAccessToken(accessTokenFromHash)
          return
        }

        setMessageType("error")
        setMessage("Invalid or expired password reset link. Please request a new one.")
      } catch {
        setMessageType("error")
        setMessage("Invalid or expired password reset link. Please request a new one.")
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [accessTokenFromHash, code, refreshTokenFromHash, type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setMessageType("")

    if (!recoveryAccessToken) {
      setMessageType("error")
      setMessage("Invalid or expired password reset link. Please request a new one.")
      return
    }

    if (password.length < 6) {
      setMessageType("error")
      setMessage("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setMessageType("error")
      setMessage("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const resp = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: recoveryAccessToken, password }),
      })

      const json = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(json?.error || "Failed to update password.")
      }

      setMessageType("success")
      setMessage("Password updated successfully. Please sign in with your new password.")
      setPassword("")
      setConfirmPassword("")

      // UX: after successful reset, take user to sign-in automatically.
      setTimeout(() => {
        router.push("/login")
        router.refresh()
      }, 700)
    } catch (err) {
      setMessageType("error")
      setMessage(err instanceof Error ? err.message : "Failed to update password.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Update Password</h1>
            <p className="text-text-secondary text-sm">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={[
                  "p-3 text-sm rounded-apple border",
                  messageType === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700",
                ].join(" ")}
              >
                {message}
              </div>
            )}

            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              disabled={isLoading}
            />

            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              disabled={isLoading}
            />

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update password"}
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

