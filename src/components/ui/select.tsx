import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function SelectItem({ value, label }: { value: string; label: string }) {
  return <option value={value}>{label}</option>
}
