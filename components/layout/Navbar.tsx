import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { auth, signOut } from "@/lib/auth"
import { LogOut } from "lucide-react"
import { NavbarClient } from "./NavbarClient"
import { Logo } from "./Logo"

export const Navbar = async () => {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#e5e5ea] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between relative">
          <Logo />
          
          <NavbarClient session={session} />
        </div>
      </div>
    </nav>
  )
}

