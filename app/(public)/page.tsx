"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Sparkles, Shield, Award, Heart, Smile, Users, PhoneCall } from "lucide-react"
import { clinic } from "@/config/clinic"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const { status } = useSession()
  const router = useRouter()

  const handleBookAppointment = () => {
    if (status === "authenticated") {
      router.push("/book")
      return
    }
    router.push(`/login?callbackUrl=${encodeURIComponent("/book")}`)
  }

  return (
    <div className="overflow-hidden bg-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white">
        {/* Background image */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{
            backgroundImage: "url('/teeth-checkup.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6 max-w-xl"
            >
              <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm backdrop-blur border border-white/20">
                <span className="mr-2 h-2 w-2 rounded-full bg-emerald-300" />
                {clinic.tagline ?? `${clinic.city}'s trusted family dentist`}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  Get a brighter smile at{" "}
                  <span className="block text-emerald-300">{clinic.name}</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-white/90">
                  Gentle, modern dental care for the whole family – from
                  routine scale and cleans to wisdom tooth removal and
                  cosmetic dentistry, right in the heart of {clinic.city}.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <Button
                  size="lg"
                  onClick={handleBookAppointment}
                  className="bg-white text-primary hover:bg-white/90 text-base sm:text-lg px-8 shadow-lg hover:shadow-xl"
                >
                  Book appointment
                </Button>
                <a
                  href={clinic.phoneHref ?? "tel:0899642861"}
                  className="text-base sm:text-lg font-medium text-white/90 hover:text-white flex items-center gap-2"
                >
                  <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 drop-shadow" />
                  <span>{clinic.phone ?? "(08) 9964 2861"}</span>
                </a>
              </div>

              <p className="text-sm text-white/80">
                Nervous about visiting the dentist?{" "}
                {clinic.doctorName
                  ? `${clinic.doctorName} and the team specialise in helping anxious patients feel relaxed and cared for.`
                  : "Our team specialises in helping anxious patients feel relaxed and cared for."}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:block"
            >
              <div className="rounded-3xl bg-white/10 border border-white/20 p-6 backdrop-blur shadow-2xl">
                <h2 className="text-xl font-semibold mb-4">
                  Why families choose {clinic.name}
                </h2>
                <ul className="space-y-3 text-sm text-white/90">
                  <li>• Calm, friendly environment for children and adults</li>
                  <li>• Gentle approach for nervous patients</li>
                  <li>• Modern equipment and evidence‑based care</li>
                  <li>• Convenient booking with evening appointments available</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-background-secondary py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 md:grid-cols-2 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-text">
              Gentle dentistry for every stage of life
            </h2>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
              {clinic.city} dentist{" "}
              <span className="font-semibold text-text">
                {clinic.doctorName ?? "Dr Chandy Koruthu, BDSc, WA"}
              </span>{" "}
              and the team at {clinic.name} welcome your entire family. From a
              child&apos;s very first visit to complex restorative work, we focus on
              comfort, clarity, and long‑term oral health.
            </p>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
              We take the time to explain treatment options in plain language so
              you can make confident decisions about your smile.
            </p>
          </div>

          <div className="rounded-3xl bg-white shadow-apple border border-border-light p-6 sm:p-8 space-y-4">
            <h3 className="text-xl font-semibold text-text">
              New patient or overdue for a check‑up?
            </h3>
            <p className="text-text-secondary">
              Many people put off seeing the dentist because of past
              experiences. Our team is experienced in working with anxious
              patients and will move at a pace that feels comfortable for you.
            </p>
            <ul className="text-sm text-text-secondary space-y-2">
              <li>• Extra time set aside for first visits</li>
              <li>• Clear quotes before any treatment begins</li>
              <li>• Options to stage treatment over multiple visits</li>
            </ul>
            <Button
              className="mt-2 bg-primary hover:bg-primary-dark"
              onClick={handleBookAppointment}
            >
              Arrange your first visit
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-text">
              Comprehensive dental care in one clinic
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              From everyday check‑ups to more advanced treatment, we offer a
              full range of services so your family can stay with a team you
              know and trust.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Scale & cleans / check‑ups",
                description:
                  "Keep your teeth and gums healthy with regular preventative visits.",
              },
              {
                icon: Shield,
                title: "Children’s dentistry",
                description:
                  "Gentle, patient care that helps kids feel relaxed and confident.",
              },
              {
                icon: Award,
                title: "Teeth whitening",
                description:
                  "Professional whitening options to safely brighten your smile.",
              },
              {
                icon: Heart,
                title: "Restorative treatments",
                description:
                  "Fillings, crowns and other solutions to restore damaged teeth.",
              },
              {
                icon: Smile,
                title: "Cosmetic dentistry",
                description:
                  "Veneers and tailored treatment plans to refine your smile.",
              },
              {
                icon: Users,
                title: "Emergency appointments",
                description:
                  "Fast help for toothaches, broken teeth and other urgent issues.",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-border-light bg-background-tertiary p-6 hover:shadow-apple transition-shadow"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <service.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary-dark via-primary to-primary-light py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
            Ready to take charge of your dental health?
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Book an appointment with {clinic.name} today and discover how
            comfortable a visit to the dentist can feel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleBookAppointment}
              className="bg-white text-primary hover:bg-white/90 text-base sm:text-lg px-8 shadow-lg hover:shadow-xl"
            >
              Book appointment online
            </Button>
            <a
              href={clinic.phoneHref ?? "tel:0899642861"}
              className="text-base sm:text-lg font-medium text-white/90 hover:text-white flex items-center gap-2"
            >
              <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 drop-shadow" />
              <span>{clinic.phone ?? "(08) 9964 2861"}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
