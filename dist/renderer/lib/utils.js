/**
 * Utility functions
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Merge Tailwind classes
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
