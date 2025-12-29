import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with conflict resolution
 *
 * @example
 * cn('text-red-500', isActive && 'font-bold')
 * cn('px-4 py-2', className)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
