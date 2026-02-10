"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { CalendarView } from "@/components/calendar/CalendarView"
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Calendar, Clock, User, FileText, X, Stethoscope } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { signIn } from "next-auth/react"
import Link from "next/link"

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning", duration: "30 min" },
  { id: "checkup", name: "Dental Checkup", duration: "45 min" },
  { id: "whitening", name: "Teeth Whitening", duration: "60 min" },
  { id: "filling", name: "Filling", duration: "45 min" },
  { id: "extraction", name: "Tooth Extraction", duration: "30 min" },
  { id: "consultation", name: "Consultation", duration: "30 min" },
]

export default function BookPage() {
  const { data: session, status } = useSession()
  const [step, setStep] = useState(1)
  const step1Ref = useRef<HTMLDivElement>(null)
  const hasPromptedLoginRef = useRef(false)

  useEffect(() => {
    // Force visibility as fallback
    if (step === 1 && step1Ref.current) {
      step1Ref.current.style.opacity = '1';
      step1Ref.current.style.visibility = 'visible';
    }
  }, [step])

  // Prompt sign-in as soon as booking is opened (best UX)
  useEffect(() => {
    if (status === "unauthenticated" && !hasPromptedLoginRef.current) {
      hasPromptedLoginRef.current = true
      setShowSignInModal(true)
    }
  }, [status])

  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<{ id: string; name: string; email: string }[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("ANY")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPhoneConfirmModal, setShowPhoneConfirmModal] = useState(false)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [signInData, setSignInData] = useState({ email: "", password: "" })
  const [signInError, setSignInError] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSigningIn, setIsSigningIn] = useState(false)

  const canProceedStep1 = selectedService !== null
  const canProceedStep2 = selectedDate !== null && selectedTime !== null
  const canProceedStep3 =
    status === "authenticated"
      ? formData.phone.trim() !== ""
      : formData.name.trim() !== "" && formData.email.trim() !== "" && formData.phone.trim() !== ""

  const hasSavedPhone = status === "authenticated" && formData.phone.trim() !== ""

  const handleSelectService = (serviceId: string) => {
    setSelectedService(serviceId)
  }

  // Load available doctors for selection
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetch("/api/doctors")
        if (!res.ok) return
        const data = await res.json()
        setDoctors(data.doctors || [])
      } catch {
        // Ignore failures; booking still works without explicit doctor choice
      }
    }
    loadDoctors()
  }, [])

  // Auto-fill form if user is signed in so Name, Email, and Phone are visible when booking
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: (session.user as any)?.name || prev.name || "",
        email: (session.user as any)?.email || prev.email || "",
        phone: (session.user as any)?.phone || prev.phone || "",
      }))
    }
  }, [session, status])

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (status !== "authenticated") {
      if (!formData.name.trim()) {
        errors.name = "Name is required"
      }
      if (!formData.email.trim()) {
        errors.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address"
      }
    }
    
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required"
    } else if (!/^[\d\s()+-]+$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignIn = async () => {
    setSignInError("")
    setIsSigningIn(true)
    
    if (!signInData.email || !signInData.password) {
      setSignInError("Please enter both email and password")
      setIsSigningIn(false)
      return
    }
    
    try {
      const result = await signIn("credentials", {
        email: signInData.email,
        password: signInData.password,
        redirect: false,
      })

      if (result?.error) {
        setSignInError("Invalid email or password")
      } else {
        setShowSignInModal(false)
        setSignInData({ email: "", password: "" })
        // Form will auto-fill from useEffect
      }
    } catch (error) {
      setSignInError("An error occurred. Please try again.")
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleStep3Continue = () => {
    if (validateForm()) {
    if (status === "authenticated") {
      // User is signed in, only need phone
        handleNext()
    } else {
      // User not signed in, show sign-in modal
      setShowSignInModal(true)
      }
    }
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return

    setIsSubmitting(true)
    try {
      // Check for existing appointment
      const checkResponse = await fetch("/api/appointments/check")
      if (checkResponse.ok) {
        const { hasAppointment } = await checkResponse.json()
        if (hasAppointment) {
          alert(
            "You already have an active appointment. Please cancel it first from Dash Board before booking a new one."
          )
          setIsSubmitting(false)
          return
        }
      }

      const appointmentDateTime = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(":").map(Number)
      appointmentDateTime.setHours(hours, minutes)

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: SERVICES.find((s) => s.id === selectedService)?.name,
          date: appointmentDateTime.toISOString(),
          doctorId: selectedDoctorId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        setStep(5) // Success step
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || "Failed to book appointment"
        const errorDetails = errorData.details ? `\n\nDetails: ${JSON.stringify(errorData.details)}` : ""
        throw new Error(`${errorMessage}${errorDetails}`)
      }
    } catch (error: any) {
      console.error("Error booking appointment:", error)
      const errorMessage = error.message || "Failed to book appointment. Please try again."
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmBookingClick = () => {
    // Prompt the user to confirm phone before actually submitting
    setShowPhoneConfirmModal(true)
  }

  const handlePhoneConfirmOk = async () => {
    setShowPhoneConfirmModal(false)
    await handleSubmit()
  }

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Progress Indicator */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex items-center",
                  s < 4 && "flex-1"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 relative z-10",
                    step >= s
                      ? "bg-[#1E40AF] text-white shadow-lg scale-110"
                      : "bg-white border-2 border-[#d2d2d7] text-[#86868b]"
                  )}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-1 sm:mx-2 transition-all duration-300 rounded-full",
                      step > s ? "bg-[#1E40AF]" : "bg-[#e5e5ea]"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs sm:text-sm text-[#86868b] px-2">
            <span className="hidden sm:inline">Service</span>
            <span className="hidden sm:inline">Date & Time</span>
            <span className="hidden sm:inline">Details</span>
            <span className="hidden sm:inline">Confirm</span>
            <span className="sm:hidden text-center w-full">Step {step} of 4</span>
          </div>
        </div>

            <div>
        <Card variant="elevated" className="p-6 sm:p-8 bg-white border border-[#e5e5ea] shadow-lg relative z-10 min-h-[500px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Service & Doctor Selection */}
            {step === 1 && (
              <motion.div
                ref={step1Ref}
                key="step1"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full relative z-10 force-visible"
                style={{ visibility: "visible", opacity: 1, display: "block" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-6 h-6 text-[#1E40AF]" />
                  <h2 className="text-2xl font-semibold text-[#1d1d1f]">
                    Select Service
                  </h2>
                </div>

                <div className="mb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {SERVICES.map((service) => (
                      <button
                        key={service.id}
                          onClick={() => handleSelectService(service.id)}
                        className={cn(
                            "p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 text-left w-full",
                            "focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2",
                            "transform hover:scale-[1.02]",
                          selectedService === service.id
                              ? "border-[#1E40AF] bg-[#1E40AF]/10 shadow-lg scale-[1.02]"
                              : "border-[#e5e5ea] hover:border-[#1E40AF]/50 bg-white hover:shadow-md"
                        )}
                          aria-pressed={selectedService === service.id}
                      >
                          <h3 className="font-semibold text-[#1d1d1f] mb-1 text-base sm:text-lg">
                          {service.name}
                        </h3>
                        <p className="text-sm text-[#86868b]">
                          {service.duration}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {doctors.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="w-5 h-5 text-[#1E40AF]" />
                      <h3 className="text-lg font-semibold text-[#1d1d1f]">
                        Choose Dentist
                      </h3>
                    </div>
                    <p className="text-sm text-[#86868b] mb-3">
                      Select a specific dentist or choose{" "}
                      <span className="font-medium text-[#1E40AF]">Any available</span>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorId("ANY")}
                        className={cn(
                          "px-3 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all",
                          "focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2",
                          selectedDoctorId === "ANY"
                            ? "border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF]"
                            : "border-[#e5e5ea] bg-white text-[#4b5563] hover:border-[#1E40AF]/50"
                        )}
                      >
                        Any available dentist
                      </button>
                      {doctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => setSelectedDoctorId(doctor.id)}
                          className={cn(
                            "px-3 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all",
                            "focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2",
                            selectedDoctorId === doctor.id
                              ? "border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF]"
                              : "border-[#e5e5ea] bg-white text-[#4b5563] hover:border-[#1E40AF]/50"
                          )}
                        >
                          {doctor.name || doctor.email}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-8">
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedStep1}
                    variant="primary"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="force-visible"
                style={{ opacity: 1, display: "block" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-6 h-6 text-[#1E40AF]" />
                  <h2 className="text-2xl font-semibold text-[#1d1d1f]">
                    Select Date & Time
                  </h2>
                </div>
                <div className="mb-6">
                  <CalendarView
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>
                <div className="mb-6">
                  <TimeSlotPicker
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onTimeSelect={setSelectedTime}
                    doctorId={selectedDoctorId}
                  />
                </div>
                <div className="flex justify-between">
                  <Button onClick={handleBack} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedStep2}
                    variant="primary"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Patient Information */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="force-visible"
                style={{ opacity: 1, display: "block" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-[#1E40AF]" />
                  <h2 className="text-2xl font-semibold text-[#1d1d1f]">
                    Your Information
                  </h2>
                </div>
                
                {status === "authenticated" ? (
                  <div className="mb-6 p-4 bg-[#1E40AF]/5 rounded-2xl border border-[#1E40AF]/20">
                    <p className="text-sm text-[#1E40AF] font-medium">
                      ✓ Signed in as {session?.user?.name || session?.user?.email}
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-[#f5f5f7] rounded-2xl">
                    <p className="text-sm text-[#86868b] mb-2">
                      Sign in to auto-fill your information
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSignInModal(true)}
                    >
                      Sign In
                    </Button>
                  </div>
                )}

                <div className="space-y-4 sm:space-y-5 mb-6">
                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" })
                    }}
                    required
                    disabled={status === "authenticated"}
                    placeholder="Enter your full name"
                    className="transition-all duration-200"
                    error={formErrors.name}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      if (formErrors.email) setFormErrors({ ...formErrors, email: "" })
                    }}
                    required
                    disabled={status === "authenticated"}
                    placeholder="your.email@example.com"
                    className="transition-all duration-200"
                    error={formErrors.email}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value })
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" })
                    }}
                    required
                    disabled={hasSavedPhone}
                    placeholder="(08) 1234 5678"
                    className="transition-all duration-200"
                    error={formErrors.phone}
                  />
                  <Textarea
                    label="Additional Notes (Optional)"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Any special requests or information we should know..."
                    className="transition-all duration-200"
                  />
                </div>
                <div className="flex justify-between">
                  <Button onClick={handleBack} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleStep3Continue}
                    disabled={!canProceedStep3}
                    variant="primary"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="force-visible"
                style={{ opacity: 1, display: "block" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-[#1E40AF]" />
                  <h2 className="text-2xl font-semibold text-[#1d1d1f]">
                    Confirm Appointment
                  </h2>
                </div>
                <div className="space-y-3 sm:space-y-4 mb-6">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Service</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">
                      {SERVICES.find((s) => s.id === selectedService)?.name}
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Date</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Time</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">
                      {selectedTime &&
                        format(
                          new Date(`2000-01-01T${selectedTime}`),
                          "h:mm a"
                        )}
                    </p>
                  </div>
                  {doctors.length > 0 && (
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                      <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Dentist</p>
                      <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">
                        {selectedDoctorId === "ANY"
                          ? "Any available dentist"
                          : doctors.find((d) => d.id === selectedDoctorId)?.name ||
                            doctors.find((d) => d.id === selectedDoctorId)?.email ||
                            "Selected dentist"}
                      </p>
                    </div>
                  )}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Name</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">{formData.name}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Email</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">{formData.email}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f5f5f7] to-white rounded-2xl border border-[#e5e5ea] hover:shadow-md transition-shadow duration-200">
                    <p className="text-xs sm:text-sm text-[#86868b] mb-1 font-medium">Phone</p>
                    <p className="font-semibold text-[#1d1d1f] text-base sm:text-lg">{formData.phone}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button onClick={handleBack} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleConfirmBookingClick}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    variant="primary"
                  >
                    Confirm Booking
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Success */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-8 force-visible"
                style={{ opacity: 1, display: "block" }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-[#1E40AF]/10 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-[#1E40AF]" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mb-4">
                  Appointment Booked!
                </h2>
                <p className="text-base sm:text-lg text-[#86868b] mb-8 max-w-md mx-auto">
                  {"Your appointment has been successfully booked. We'll send you a"}
                  confirmation email shortly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button
                    variant="primary"
                    onClick={() => (window.location.href = "/dashboard")}
                    className="transform hover:scale-105 transition-all duration-300"
                  >
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/")}
                    className="transform hover:scale-105 transition-all duration-300"
                  >
                    Back to Home
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        </div>
      </div>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSignInModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-[#1d1d1f]">Sign In</h3>
                <button
                  onClick={() => setShowSignInModal(false)}
                  className="text-[#86868b] hover:text-[#1d1d1f]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {signInError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  {signInError}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={signInData.email}
                  onChange={(e) =>
                    setSignInData({ ...signInData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  value={signInData.password}
                  onChange={(e) =>
                    setSignInData({ ...signInData, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
                <div className="flex items-center justify-end">
                  <Link
                    href={
                      signInData.email
                        ? `/reset-password?email=${encodeURIComponent(signInData.email)}`
                        : "/reset-password"
                    }
                    onClick={() => {
                      try {
                        sessionStorage.setItem("reset_prefill_email", signInData.email || "")
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-sm text-[#1E40AF] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button
                  onClick={handleSignIn}
                  variant="primary"
                  className="w-full"
                  loading={isSigningIn}
                  disabled={isSigningIn}
                >
                  Sign In
                </Button>
                <p className="text-sm text-[#86868b] text-center">
                  {"Don't have an account?"}{" "}
                  <a href="/register" className="text-[#1E40AF] hover:underline">
                    Sign up
                  </a>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone confirmation modal before submission */}
      <AnimatePresence>
        {showPhoneConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => (isSubmitting ? null : setShowPhoneConfirmModal(false))}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-[#1d1d1f] mb-3">
                Confirm your phone number
              </h3>
              <p className="text-sm text-[#4b5563] mb-6">
                Please confirm your phone number. You will soon receive a confirmation message or call from us.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPhoneConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePhoneConfirmOk}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  OK
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
