import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-shimmer bg-border/20 rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
