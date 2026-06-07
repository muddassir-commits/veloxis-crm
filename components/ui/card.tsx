import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.ComponentProps<"div"> {
  variant?: "default" | "compact" | "dashboard"
  size?: "default" | "sm"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card"
        data-size={size}
        className={cn(
          "group/card flex flex-col gap-4 overflow-hidden text-sm text-text-primary transition-all duration-300",
          variant === "default" && "bg-bg-card/70 backdrop-blur-[12px] border border-border/30 rounded-xl shadow-elevated hover:bg-bg-card/85 hover:shadow-hover hover:-translate-y-0.5 py-5",
          variant === "compact" && "bg-bg-card/60 border border-border/20 rounded-lg shadow-subtle py-3 text-xs",
          variant === "dashboard" && "bg-gradient-to-br from-bg-card/80 to-bg-card/50 backdrop-blur-[12px] border border-border/30 rounded-xl shadow-elevated py-6",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-5 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-semibold text-text-primary text-base leading-snug tracking-tight group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-text-secondary", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-3 text-text-secondary", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t border-border/20 bg-bg-card-hover/25 px-5 py-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
