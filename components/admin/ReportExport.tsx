"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Calendar, Download, FileSpreadsheet, FileText } from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns"
import { cn } from "@/lib/utils"

interface ReportExportProps {
  onExport: (type: "weekly" | "monthly", startDate: Date, endDate: Date, format: "excel" | "pdf") => Promise<void>
  isLoading?: boolean
  lockQuickSelectToReportType?: boolean
}

export const ReportExport: React.FC<ReportExportProps> = ({
  onExport,
  isLoading = false,
  lockQuickSelectToReportType = false,
}) => {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly")
  const [startDate, setStartDate] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState<string>(
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  )
  const [quickSelection, setQuickSelection] = useState<
    "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | null
  >("thisWeek")

  const handleQuickSelect = (type: "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth") => {
    if (lockQuickSelectToReportType) {
      const isWeekly = type === "thisWeek" || type === "lastWeek"
      const isMonthly = type === "thisMonth" || type === "lastMonth"
      if ((reportType === "weekly" && !isWeekly) || (reportType === "monthly" && !isMonthly)) {
        return
      }
    }
    const now = new Date()
    let start: Date
    let end: Date

    if (type === "thisWeek") {
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      setReportType("weekly")
    } else if (type === "lastWeek") {
      const lastWeek = subWeeks(now, 1)
      start = startOfWeek(lastWeek, { weekStartsOn: 1 })
      end = endOfWeek(lastWeek, { weekStartsOn: 1 })
      setReportType("weekly")
    } else if (type === "thisMonth") {
      start = startOfMonth(now)
      end = endOfMonth(now)
      setReportType("monthly")
    } else {
      const lastMonth = subMonths(now, 1)
      start = startOfMonth(lastMonth)
      end = endOfMonth(lastMonth)
      setReportType("monthly")
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
    setQuickSelection(type)
  }

  // When reportType changes, default to ThisWeek/ThisMonth and prevent cross selection
  useEffect(() => {
    if (!lockQuickSelectToReportType) return
    if (reportType === "weekly") {
      handleQuickSelect("thisWeek")
    } else {
      handleQuickSelect("thisMonth")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, lockQuickSelectToReportType])

  const handleExport = async (format: "excel" | "pdf") => {
    await onExport(reportType, new Date(startDate), new Date(endDate), format)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
          Report Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setReportType("weekly")}
            className={`p-3 rounded-xl border-2 transition-all ${
              reportType === "weekly"
                ? "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                : "border-[#e5e5ea] hover:border-[#1E40AF]/50"
            }`}
          >
            Weekly Report
          </button>
          <button
            type="button"
            onClick={() => setReportType("monthly")}
            className={`p-3 rounded-xl border-2 transition-all ${
              reportType === "monthly"
                ? "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                : "border-[#e5e5ea] hover:border-[#1E40AF]/50"
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1d1d1f] mb-3">
          Quick Select
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">
              Weekly
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  quickSelection === "thisWeek" &&
                    "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                )}
                onClick={() => handleQuickSelect("thisWeek")}
                disabled={lockQuickSelectToReportType && reportType !== "weekly"}
              >
                This Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  quickSelection === "lastWeek" &&
                    "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                )}
                onClick={() => handleQuickSelect("lastWeek")}
                disabled={lockQuickSelectToReportType && reportType !== "weekly"}
              >
                Last Week
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">
              Monthly
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  quickSelection === "thisMonth" &&
                    "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                )}
                onClick={() => handleQuickSelect("thisMonth")}
                disabled={lockQuickSelectToReportType && reportType !== "monthly"}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  quickSelection === "lastMonth" &&
                    "border-[#1E40AF] bg-[#1E40AF]/10 font-semibold"
                )}
                onClick={() => handleQuickSelect("lastMonth")}
                disabled={lockQuickSelectToReportType && reportType !== "monthly"}
              >
                Last Month
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col items-center gap-3 pt-4 border-t border-[#e5e5ea]">
        <Button
          type="button"
          variant="primary"
          onClick={() => handleExport("pdf")}
          disabled={isLoading}
          loading={isLoading}
          className="w-48 sm:w-56 px-4 py-2"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleExport("excel")}
          disabled={isLoading}
          loading={isLoading}
          className="w-48 sm:w-56 px-4 py-2"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </span>
        </Button>
      </div>
    </div>
  )
}

