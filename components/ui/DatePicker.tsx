"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <div className={cn("relative w-full cursor-pointer", className)}>
            <Input
              type="text"
              readOnly
              disabled={disabled}
              placeholder={placeholder}
              value={value ? format(value, "dd-MM-yyyy") : ""}
              className="pr-10 cursor-pointer"
            />
            <CalendarIcon className="absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-text-tertiary pointer-events-none" />
          </div>
        }
      />
      <PopoverContent className="w-auto p-0 border-none" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
