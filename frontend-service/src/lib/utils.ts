/* Relative Imports */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes.
 *
 * @param {...inputs} A variable number of Tailwind CSS classes.
 * @return {string} The merged class string.
 *
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
