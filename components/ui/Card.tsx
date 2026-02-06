import React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "elevated" | "outlined"
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const variants = {
    default: "bg-background border border-border-light shadow-apple",
    elevated: "bg-background shadow-apple-lg border border-border-light",
    outlined: "bg-background border-2 border-border",
  }

  return (
    <div
      className={cn(
        "rounded-apple-lg p-6 transition-all duration-200 hover:-translate-y-0.5",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

