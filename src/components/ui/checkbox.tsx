import * as React from "react"
import { cn } from "@/lib/utils"

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn("w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", className)}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"
