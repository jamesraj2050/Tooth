export type ClinicKey = "centro" | "tooth"

export const CLINIC =
  (process.env.NEXT_PUBLIC_CLINIC_KEY as ClinicKey | undefined) ?? "centro"

export type ClinicConfig = {
  key: ClinicKey
  name: string
  city: string
  timezone: string
  tagline?: string
  phone?: string
  phoneHref?: string
  email?: string
  address?: string
  logoSrc?: string
  doctorName?: string
  doctorRegistration?: string
  hours?: string[]
}

export const clinicConfig: Record<ClinicKey, ClinicConfig> = {
  centro: {
    key: "centro",
    name: "Centro Dental",
    city: "Geraldton",
    timezone: "Australia/Perth",
    tagline: "Geraldton's trusted family dentist",
    phone: "(08) 9964 2861",
    phoneHref: "tel:0899642861",
    email: "info@centrodental.com.au",
    address: "86 Sanford Street, Geraldton WA 6530",
    doctorName: "Dr Chandy Koruthu, BDSc, WA",
    hours: [
      "Mon - Fri: 9:00 AM - 6:00 PM",
      "Saturday: 9:00 AM - 2:00 PM",
      "Sunday: Closed",
    ],
  },
  tooth: {
    key: "tooth",
    name: "Tooth Oral Care Centre",
    city: "Bangalore",
    timezone: "Asia/Kolkata",
    tagline: "Compassionate dental care in Bangalore",
    phone: "74114 67924",
    phoneHref: "tel:7411467924",
    email: "info@toothoralcare.com", // adjust if you have a different official email
    address:
      "No. 40, Hutchins Road, 6th Cross, (Behind Mini Bazaar) Cooke Town, St. Thomas Town Post, Bangalore – 560 084",
    doctorName: "Dr. Jawahar R.S.",
    doctorRegistration: "Registration No.: 8563-A",
    hours: ["Everyday: 9:00 AM - 7:00 PM"], // refine if there are different weekday/weekend timings
    // Uses /public/tooth-logo.jpg
    logoSrc: "/tooth-logo.jpg",
  },
}

export const activeClinic = clinicConfig[CLINIC]

// Simple alias so you can `import { clinic } from "@/config/clinic"`
export const clinic = activeClinic


