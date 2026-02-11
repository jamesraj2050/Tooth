"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { UserPlus } from "lucide-react"

function deriveNameFromEmail(email: string) {
  const local = (email || "").split("@")[0] || ""
  const cleaned = local
    .replace(/[._-]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .trim()

  if (!cleaned) return ""

  return cleaned
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })
  const [nameTouched, setNameTouched] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Prefill from prior failed login attempt (stored in sessionStorage by /login page)
  useEffect(() => {
    try {
      const prefillEmail = sessionStorage.getItem("register_prefill_email") || ""
      const prefillPassword = sessionStorage.getItem("register_prefill_password") || ""

      if (!prefillEmail && !prefillPassword) return

      setFormData((prev) => {
        const nextEmail = prefillEmail || prev.email
        const nextPassword = prefillPassword || prev.password

        const nextName =
          prev.name.trim() !== ""
            ? prev.name
            : deriveNameFromEmail(nextEmail) || prev.name

        return {
          ...prev,
          email: nextEmail,
          password: nextPassword,
          confirmPassword: nextPassword ? nextPassword : prev.confirmPassword,
          name: nextName,
        }
      })

      // Clear after use so future visits don't get stale values
      sessionStorage.removeItem("register_prefill_email")
      sessionStorage.removeItem("register_prefill_password")
    } catch {
      // ignore
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
        return
      }

      // Redirect to login
      router.push("/login?registered=true")
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated" className="p-8">
          <div className="text-center mb-8">
            <UserPlus className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-text mb-2">Create Account</h1>
            <p className="text-text-secondary">
              Sign up to start booking appointments
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-apple text-red-600 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                (setNameTouched(true), setFormData({ ...formData, name: e.target.value }))
              }
              required
              placeholder="John Doe"
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                const nextEmail = e.target.value
                setFormData((prev) => ({
                  ...prev,
                  email: nextEmail,
                  name:
                    !nameTouched && prev.name.trim() === ""
                      ? deriveNameFromEmail(nextEmail)
                      : prev.name,
                }))
              }}
              required
              placeholder="you@example.com"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              placeholder="Enter password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              placeholder="Confirm password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

