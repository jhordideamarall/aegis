import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// cn is web-only (tailwind-merge), kept here intentionally
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export {
  formatIDR,
  escapeILikePattern,
  toLocalISODate,
  isSameLocalDate,
  DEFAULT_TIME_ZONE,
  toTimeZoneISODate,
  toTimeZoneHourKey,
  filterProducts,
  getProductCategories,
} from '@aegis/core'
