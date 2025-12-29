import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for proper class override handling
 *
 * @example
 * cn('text-red-500', isActive && 'font-bold')
 * cn('px-4 py-2', className)
 * cn('bg-blue-500', 'bg-red-500') // Returns 'bg-red-500' (correct override)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
