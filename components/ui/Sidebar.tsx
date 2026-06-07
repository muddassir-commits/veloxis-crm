"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
}

export function Sidebar({ className, collapsed, children, ...props }: SidebarProps) {
  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed}
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-bg-dark to-bg-card border-r border-border/20 z-40 transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[200px]",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarSection({ className, label, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 mt-4", className)} {...props}>
      {label && (
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-4 py-2 select-none">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

export interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  collapsed?: boolean
  icon?: React.ReactNode
}

export function SidebarItem({
  className,
  active,
  collapsed,
  icon,
  children,
  ...props
}: SidebarItemProps) {
  return (
    <div
      data-slot="sidebar-item"
      data-active={active}
      className={cn(
        "flex items-center h-10 px-4 gap-3 cursor-pointer rounded-lg text-text-secondary hover:bg-primary/10 hover:text-text-primary transition-all duration-200 select-none mx-2",
        active && "bg-primary/15 text-primary-light border-l-[3px] border-primary rounded-l-none pl-[13px] font-medium",
        collapsed && "justify-center px-0 mx-1",
        className
      )}
      {...props}
    >
      {icon && <span className={cn("size-5 shrink-0 flex items-center justify-center", active && "text-primary-light")}>{icon}</span>}
      {!collapsed && <span className="text-xs truncate">{children}</span>}
    </div>
  )
}
