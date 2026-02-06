"use client"

import { useState } from "react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

interface PaymentFormProps {
  appointmentId: string
  patientName: string
  currentAmount?: number
  currentTreatmentStatus?: "PENDING" | "PARTIAL" | "COMPLETED"
  onSubmit: (data: PaymentFormData) => Promise<void>
  onCancel: () => void
  onRepeatAppointment?: () => void
  // Optional draft state so values persist if modal closes/reopens
  draftAmount?: string
  onDraftAmountChange?: (value: string) => void
  draftTreatmentStatus?: "PENDING" | "PARTIAL" | "COMPLETED"
  onDraftTreatmentStatusChange?: (value: "PENDING" | "PARTIAL" | "COMPLETED") => void
  repeatDone?: boolean
  isLoading?: boolean
}

export interface PaymentFormData {
  appointmentId: string
  amount: number
  treatmentStatus: "PENDING" | "PARTIAL" | "COMPLETED"
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  appointmentId,
  patientName,
  currentAmount,
  currentTreatmentStatus = "PENDING",
  onSubmit,
  onCancel,
  onRepeatAppointment,
  draftAmount,
  onDraftAmountChange,
  draftTreatmentStatus,
  onDraftTreatmentStatusChange,
  repeatDone = false,
  isLoading = false,
}) => {
  const [amount, setAmount] = useState<string>(
    draftAmount ?? currentAmount?.toString() ?? ""
  )
  const [treatmentStatus, setTreatmentStatus] = useState<
    "PENDING" | "PARTIAL" | "COMPLETED"
  >(draftTreatmentStatus ?? currentTreatmentStatus ?? "PENDING")
  const [error, setError] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      setError("Please enter a valid amount")
      return
    }

    await onSubmit({
      appointmentId,
      amount: amountNum,
      treatmentStatus,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-[#f5f5f7] rounded-xl">
        <p className="text-sm text-[#86868b] mb-1">Patient</p>
        <p className="font-semibold text-[#1d1d1f]">{patientName}</p>
      </div>

      <Input
        label="Payment Amount (AUD) *"
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => {
          const next = e.target.value
          setAmount(next)
          onDraftAmountChange?.(next)
          setError("")
        }}
        error={error}
        placeholder="0.00"
        required
      />

      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
          Treatment Status *
        </label>
        <div className="flex flex-wrap gap-3">
          {(["PARTIAL", "COMPLETED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                const next = status === "COMPLETED" ? "COMPLETED" : "PARTIAL"
                setTreatmentStatus(next)
                onDraftTreatmentStatusChange?.(next)
              }}
              className={[
                "px-4 py-2 rounded-xl border-2 text-[11px] sm:text-xs font-semibold text-center",
                "whitespace-nowrap min-w-[130px]",
                "transition-all focus:outline-none focus:ring-0",
                treatmentStatus === status
                  ? status === "PARTIAL"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-green-600 bg-green-50 text-green-700"
                  : "border-[#e5e5ea] text-[#1d1d1f] hover:border-[#1E40AF]/50",
              ].join(" ")}
            >
              {status}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onRepeatAppointment?.()}
            disabled={repeatDone || !onRepeatAppointment || treatmentStatus !== "PARTIAL"}
            className={[
              "px-4 py-2 rounded-xl border-2 text-[11px] sm:text-xs font-semibold text-center",
              "whitespace-nowrap min-w-[170px]",
              "transition-all focus:outline-none focus:ring-0",
              repeatDone
                ? "border-green-600 bg-green-50 text-green-700"
                : !onRepeatAppointment || treatmentStatus !== "PARTIAL"
                ? "border-[#e5e5ea] text-[#9ca3af] bg-[#fafafa] cursor-not-allowed"
                : "border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF] hover:border-[#1E40AF]",
            ].join(" ")}
          >
            Repeat appointment
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e5ea]">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading} loading={isLoading}>
          Update Payment
        </Button>
      </div>
    </form>
  )
}

