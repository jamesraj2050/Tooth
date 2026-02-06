"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { X } from "lucide-react"

interface CancelAppointmentButtonProps {
  appointmentId: string
}

export function CancelAppointmentButton({ appointmentId }: CancelAppointmentButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return
    }

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        throw new Error("Failed to cancel appointment")
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      alert("Failed to cancel appointment. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleCancel}
      disabled={isCancelling}
      className="border-red-200 text-red-600 hover:bg-red-50"
    >
      <X className="w-4 h-4 mr-2" />
      {isCancelling ? "Cancelling..." : "Cancel"}
    </Button>
  )
}

