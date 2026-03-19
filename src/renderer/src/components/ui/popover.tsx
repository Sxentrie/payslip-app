/**
 * @file: src/renderer/src/components/ui/popover.tsx
 *
 * @description:
 * Shadcn UI Popover component built on @radix-ui/react-popover
 * with animated portal content.
 *
 * @module: Renderer.UI.Popover
 *
 * @overview:
 * Wraps Radix Popover primitives with design-system styling and
 * enter/exit animations. Content renders in a portal with shadow,
 * border, and rounded corners. Used by the NewPayslip page to
 * host the Calendar date picker.
 *
 * @dependencies:
 * - react
 * - @radix-ui/react-popover
 * - src/renderer/src/lib/utils.ts
 *
 * @outputs:
 * - Popover (component)
 * - PopoverTrigger (component)
 * - PopoverContent (component)
 */

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
