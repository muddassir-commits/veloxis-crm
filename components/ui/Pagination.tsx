import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PaginationProps extends React.ComponentPropsWithoutRef<"nav"> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  className,
  currentPage,
  totalPages,
  onPageChange,
  ...props
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages = []
    const range = 1

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis")
      }
    }
    return pages
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-between px-2 py-4", className)}
      {...props}
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary">
          Showing Page <span className="font-semibold text-text-primary">{currentPage}</span> of{" "}
          <span className="font-semibold text-text-primary">{totalPages}</span>
        </p>
        <ul className="flex items-center space-x-1.5 list-none">
          <li>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Go to previous page"
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </li>
          {getPageNumbers().map((page, index) => (
            <li key={index}>
              {page === "ellipsis" ? (
                <span className="flex size-8 items-center justify-center text-text-tertiary">
                  <MoreHorizontal className="size-4" />
                </span>
              ) : (
                <Button
                  variant={page === currentPage ? "default" : "secondary"}
                  size="icon-sm"
                  aria-label={`Go to page ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )}
            </li>
          ))}
          <li>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Go to next page"
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </li>
        </ul>
      </div>
    </nav>
  )
}
