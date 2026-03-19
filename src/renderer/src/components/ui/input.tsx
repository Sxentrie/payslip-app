/**
 * @file: src/renderer/src/components/ui/input.tsx
 *
 * @description:
 * Shadcn UI Input primitive with inset shadow and focus ring styling.
 *
 * @module: Renderer.UI.Input
 *
 * @overview:
 * A forwarded-ref input element styled with the design system's
 * border, background, and focus-ring tokens. Supports all native
 * HTML input attributes and file input styling. Used across
 * NewPayslip, PayslipLog, Employees, and Branches pages.
 *
 * @dependencies:
 * - react
 * - src/renderer/src/lib/utils.ts
 *
 * @outputs:
 * - Input (component)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-muted/20 px-3 py-1 text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
