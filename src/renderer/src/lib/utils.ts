/**
 * @file: src/renderer/src/lib/utils.ts
 *
 * @description:
 * Tailwind CSS class name merge utility combining clsx and
 * tailwind-merge for conflict-free class composition.
 *
 * @module: Renderer.Lib.Utils
 *
 * @overview:
 * Exports a single cn() helper that first resolves conditional
 * class names via clsx, then deduplicates conflicting Tailwind
 * utilities via twMerge. Every Shadcn UI component and page
 * component uses this function for className assembly.
 *
 * @dependencies:
 * - clsx
 * - tailwind-merge
 *
 * @outputs:
 * - cn (function)
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
