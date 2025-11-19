import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function tryParseJson(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}
