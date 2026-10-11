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

/**
 * Returns the current local wall-clock time as a value for an
 * `<input type="datetime-local">` (YYYY-MM-DDTHH:mm), not UTC.
 */
export function localDateTimeInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Returns the current local calendar date as a value for an
 * `<input type="date">` (YYYY-MM-DD), not UTC — avoids off-by-one-day
 * defaults for entries made before the UTC offset rolls over.
 */
export function localDateInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Serializes a form date value to an ISO string, interpreting a bare date-only
 * `YYYY-MM-DD` as LOCAL midnight. `new Date('YYYY-MM-DD')` parses as UTC, which
 * shifts the stored calendar date back a day for users west of UTC; appending a
 * local time component avoids that. Falls back to now for empty input.
 */
export function localDateInputToISO(value?: string): string {
  if (!value) return new Date().toISOString()
  const parsed = value.length === 10 ? new Date(`${value}T00:00`) : new Date(value)
  if (isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}
