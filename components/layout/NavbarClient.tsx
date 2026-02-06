"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { signOut as nextAuthSignOut } from "next-auth/react"
import { LogOut, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface NavbarClientProps {
  session: any
}

export const NavbarClient: React.FC<NavbarClientProps> = ({ session }) => {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const bookHref = session ? "/book" : "/login?callbackUrl=%2Fbook"

  const handleSignOut = async () => {
    // Let NextAuth handle clearing the session and redirecting home
    await nextAuthSignOut({ callbackUrl: "/" })
    setMobileMenuOpen(false)
  }

  const isActive = (path: string) => pathname?.startsWith(path)

  return (
        <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
        {session?.user?.role !== "ADMIN" && session?.user?.role !== "DOCTOR" && (
          <Link
            href={bookHref}
            className={`text-base font-medium transition-colors ${
              pathname === "/book"
                ? "text-[#1E40AF]"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            Book Appointment
          </Link>
        )}
        {session ? (
          <>
            {session.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className={`text-base font-medium transition-colors ${
                  isActive("/admin")
                    ? "text-[#1E40AF]"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                Admin Dashboard
              </Link>
            )}
            {session.user?.role === "DOCTOR" && (
              <Link
                href="/doctor"
                className={`text-base font-medium transition-colors ${
                  isActive("/doctor")
                    ? "text-[#1E40AF]"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                Doctor Dashboard
              </Link>
            )}
            {(!session.user?.role || session.user?.role === "PATIENT") && (
              <Link
                href="/dashboard"
                className={`text-base font-medium transition-colors ${
                  isActive("/dashboard")
                    ? "text-[#1E40AF]"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                Dashboard
              </Link>
            )}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </>
      )}
    </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-[#1d1d1f]" />
        ) : (
          <Menu className="w-6 h-6 text-[#1d1d1f]" />
        )}
      </button>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-[#e5e5ea] shadow-lg z-50"
          >
            <div className="flex flex-col p-4 gap-3">
              {session?.user?.role !== "ADMIN" && session?.user?.role !== "DOCTOR" && (
                <Link
                  href={bookHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === "/book"
                      ? "bg-[#1E40AF]/10 text-[#1E40AF]"
                      : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                  }`}
                >
                  Book Appointment
                </Link>
              )}
              {session ? (
                <>
                  {session.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isActive("/admin")
                          ? "bg-[#1E40AF]/10 text-[#1E40AF]"
                          : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {session.user?.role === "DOCTOR" && (
                    <Link
                      href="/doctor"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isActive("/doctor")
                          ? "bg-[#1E40AF]/10 text-[#1E40AF]"
                          : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      Doctor Dashboard
                    </Link>
                  )}
                  {(!session.user?.role || session.user?.role === "PATIENT") && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isActive("/dashboard")
                          ? "bg-[#1E40AF]/10 text-[#1E40AF]"
                          : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-lg font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

