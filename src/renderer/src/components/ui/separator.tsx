/**
 * @file: src/renderer/src/components/ui/separator.tsx
 *
 * @description:
 * Shadcn UI Separator component — a horizontal or vertical divider
 * with proper ARIA role semantics.
 *
 * @module: Renderer.UI.Separator
 *
 * @overview:
 * Renders a thin line (1px) using the border design token. Supports
 * horizontal and vertical orientations. When decorative is true
 * (default), renders with role="none"; otherwise uses
 * role="separator" with aria-orientation. Used in the sidebar
 * footer, payslip summary, and detail dialogs.
 *
 * @dependencies:
 * - react
 * - src/renderer/src/lib/utils.ts
 *
 * @outputs:
 * - Separator (component)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={!decorative ? orientation : undefined}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
}

export { Separator }
