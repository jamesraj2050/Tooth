"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { signIn } from "next-auth/react"
import { Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || ""
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [errorType, setErrorType] = useState<
    "" | "user_not_found" | "wrong_password" | "generic"
  >("")
  const [isLoading, setIsLoading] = useState(false)

  const persistRegisterPrefill = () => {
    try {
      sessionStorage.setItem("register_prefill_email", formData.email || "")
      sessionStorage.setItem("register_prefill_password", formData.password || "")
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrorType("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        try {
          // Check if the email exists to show a clearer error and reset option
          const resp = await fetch(`/api/auth/exists?email=${encodeURIComponent(formData.email)}`)
          const json = await resp.json()
          if (json?.exists) {
            setError("User already exists — please enter the correct password.")
            setErrorType("wrong_password")
          } else {
            setError("User does not exist — please sign up.")
            setErrorType("user_not_found")
          }
        } catch (e) {
          setError("Invalid email or password.")
          setErrorType("generic")
        }
      } else {
        router.push(callbackUrl || "/dashboard")
        router.refresh()
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
      setErrorType("generic")
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
            <h1 className="text-3xl font-bold text-text mb-2">Welcome</h1>
            <p className="text-text-secondary">
              Sign in to your account, or create a new one to book appointments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-apple text-sm">
                {errorType === "user_not_found" ? (
                  <p className="text-red-600">
                    User does not exist — please{" "}
                    <Link
                      href="/register"
                      onClick={persistRegisterPrefill}
                      className="underline font-medium"
                    >
                      Sign up
                    </Link>
                    .
                  </p>
                ) : (
                  <p className="text-red-600">{error}</p>
                )}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              placeholder="••••••••"
            />
            <div className="flex items-center justify-end">
              <Link href="/reset-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{" "}
              <Link
                href="/register"
                onClick={persistRegisterPrefill}
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

