import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning";
}

export function Alert({ className, variant = "default", children, ...props }: AlertProps) {
  const variants = {
    default: "bg-gray-50 border-gray-300 text-gray-800",
    destructive: "bg-red-50 border-red-300 text-red-700",
    success: "bg-green-50 border-green-300 text-green-700",
    warning: "bg-yellow-50 border-yellow-300 text-yellow-700",
  };

  return (
    <div
      role="alert"
      className={cn(
        "w-full rounded-md border p-4 flex flex-col gap-1 shadow-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <h5 className={cn("font-semibold leading-none tracking-tight", className)}>
      {children}
    </h5>
  );
}

export function AlertDescription({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("text-sm opacity-90", className)}>
      {children}
    </div>
  );
}
