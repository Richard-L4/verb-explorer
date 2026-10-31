/**
 * Shared class-name helper: clsx handles conditional inputs, then tailwind-merge
 * resolves conflicting Tailwind utilities. Works in browser and server rendering.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
