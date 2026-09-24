/**
 * Currency and Number Formatting Helpers
 * Monetary amounts are represented internally in integer Paise (1 Rupee = 100 Paise).
 */

export function paiseToRupees(paise: number): number {
  return paise / 100
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Formats a paise value as an Indian Rupee string (e.g. ₹52,650 or ₹1,200.50).
 */
export function formatINR(paise: number, includePaiseDecimals: boolean = false): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: includePaiseDecimals ? 2 : 0,
    minimumFractionDigits: includePaiseDecimals ? 2 : 0,
  }).format(rupees)
}

/**
 * Parses user input string (in Rupees) into integer Paise.
 */
export function parseRupeesToPaise(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100)
  }
  const cleaned = input.replace(/[^0-9.-]/g, '')
  const val = parseFloat(cleaned)
  if (isNaN(val)) return 0
  return Math.round(val * 100)
}

/**
 * Formats date for display.
 */
export function formatDate(date: string | Date | number): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: string | Date | number): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
