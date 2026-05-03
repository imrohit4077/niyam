/** ISO 4217-style 3-letter code for job / kickoff salary currency. */
export function normalizeCurrencyCode(raw: string | undefined | null): string {
  const t = (raw ?? 'USD').trim().toUpperCase().replace(/[^A-Z]/g, '')
  if (t.length >= 3) return t.slice(0, 3)
  return 'USD'
}

/** Common ISO codes; workspace default is merged first in selects. */
export const COMMON_CURRENCIES: readonly string[] = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'CHF',
  'JPY',
  'SGD',
  'HKD',
  'NZD',
  'SEK',
  'NOK',
  'MXN',
  'BRL',
  'ZAR',
]
