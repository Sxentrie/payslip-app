/**
 * @file: src/renderer/src/components/ui/label.tsx
 *
 * @description:
 * Shadcn UI Label primitive for form field labelling with
 * peer-disabled state support.
 *
 * @module: Renderer.UI.Label
 *
 * @overview:
 * A forwarded-ref label element styled with the design system's
 * font-medium and peer-disabled tokens. Automatically dims when
 * its associated input is disabled via the peer CSS utility.
 *
 * @dependencies:
 * - react
 * - src/renderer/src/lib/utils.ts
 *
 * @outputs:
 * - Label (component)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    )
  }
)
Label.displayName = 'Label'

export { Label }
