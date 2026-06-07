import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border bg-bg-card/50 backdrop-blur-[8px] px-3 py-2 text-sm text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-border-subtle/20 disabled:opacity-50",
          error
            ? "border-error bg-error/5 focus-visible:border-error focus-visible:shadow-[0_0_16px_rgba(239,68,68,0.15)]"
            : "border-border/30 hover:border-border/60 focus-visible:border-primary/50 focus-visible:bg-bg-card/70 focus-visible:shadow-[0_0_16px_rgba(37,99,235,0.15)]",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
