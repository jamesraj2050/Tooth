"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
}) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-white rounded-2xl shadow-2xl w-full max-h-[calc(100vh-3rem)] overflow-y-auto",
                sizeClasses[size],
                className
              )}
            >
              {title && (
                <div className="flex items-center justify-between p-6 border-b border-[#e5e5ea]">
                  <h2 className="text-xl font-semibold text-[#1d1d1f]">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-[#f5f5f7] rounded-full transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-[#86868b]" />
                  </button>
                </div>
              )}
              <div className={cn("p-6", !title && "pt-6")}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

