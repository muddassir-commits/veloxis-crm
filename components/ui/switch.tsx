"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-checked:bg-success data-unchecked:bg-border/30 data-disabled:cursor-not-allowed data-disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white ring-0 transition-transform shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
          "group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3",
          "group-data-[size=default]/switch:data-unchecked:translate-x-[2px] group-data-[size=default]/switch:data-checked:translate-x-[22px]",
          "group-data-[size=sm]/switch:data-unchecked:translate-x-[1px] group-data-[size=sm]/switch:data-checked:translate-x-[11px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
