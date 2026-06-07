"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type NavBarProps = React.HTMLAttributes<HTMLDivElement>;

export function NavBar({ className, children, ...props }: NavBarProps) {
  return (
    <header
      data-slot="navbar"
      className={cn(
        "flex h-14 w-full items-center justify-between bg-bg-card/85 backdrop-blur-[12px] border-b border-border/20 px-6 sticky top-0 z-30 select-none",
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
}
