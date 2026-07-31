import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const localizeNumber = (str: string | number, locale: string) => {
  const s = String(str);
  if (locale !== "ar") return s;
  const arabicNumbers = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
  return s.replace(/\d/g, d => arabicNumbers[parseInt(d)]);
};
