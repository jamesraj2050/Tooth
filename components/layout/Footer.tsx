'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone, Mail, MapPin } from "lucide-react"
import { clinic } from "@/config/clinic"

export const Footer = () => {
  const pathname = usePathname()

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/doctor")) {
    return null
  }

  return (
    <footer className="bg-[#f5f5f7] border-t border-[#e5e5ea]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg sm:text-xl font-semibold text-[#1d1d1f] mb-3 sm:mb-4">
              {clinic.name}
            </h3>
            <p className="text-[#86868b] text-sm sm:text-base leading-relaxed">
              {(clinic.tagline ?? `${clinic.city}'s trusted family dentist`) +
                " providing quality dental care for patients both young and old."}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-[#1d1d1f] mb-3 sm:mb-4 text-base sm:text-lg">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-[#86868b]">
              <li>
                <Link href="/" className="hover:text-[#1d1d1f] transition-colors inline-block">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-[#1d1d1f] transition-colors inline-block">
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-[#1d1d1f] mb-3 sm:mb-4 text-base sm:text-lg">Contact</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-[#86868b]">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <a
                  href={clinic.phoneHref ?? "tel:0899642861"}
                  className="hover:text-[#1d1d1f] transition-colors"
                >
                  {clinic.phone ?? "(08) 9964 2861"}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <a
                  href={`mailto:${clinic.email ?? "info@centrodental.com.au"}`}
                  className="hover:text-[#1d1d1f] transition-colors break-all"
                >
                  {clinic.email ?? "info@centrodental.com.au"}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-1 flex-shrink-0" />
                <span>{clinic.address ?? "86 Sanford Street, Geraldton WA 6530"}</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-[#1d1d1f] mb-3 sm:mb-4 text-base sm:text-lg">Hours</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-[#86868b]">
              {(clinic.hours ?? [
                "Mon - Fri: 9:00 AM - 6:00 PM",
                "Saturday: 9:00 AM - 2:00 PM",
                "Sunday: Closed",
              ]).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#e5e5ea] text-center text-sm sm:text-base text-[#86868b]">
          <p>&copy; {new Date().getFullYear()} {clinic.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

