import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeTerm(name: string): string {
  return name.toLowerCase().trim().replace(/[-\s_]+/g, "");
}

