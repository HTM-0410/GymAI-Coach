import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanDashes(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\u2012\u2013\u2014\u2015]/g, '-');
}