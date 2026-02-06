import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { clinic } from "@/config/clinic"

export const metadata: Metadata = {
  title: `${clinic.name} - ${clinic.city}'s Trusted Family Dentist`,
  description: `Quality dental care for patients both young and old in ${clinic.city}. Book your appointment with our friendly team.`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background-secondary text-text">
        <SessionProvider>
          <Navbar />
          <main className="min-h-screen bg-background relative">
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}

