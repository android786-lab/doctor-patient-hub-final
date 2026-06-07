export const CURRENCY_CODE = 'PKR'
export const CURRENCY_SYMBOL = 'Rs'
export const CURRENCY_LOCALE = 'en-PK'

/** Display money in Pakistani Rupees (no decimals by default). */
export function formatMoney(amount, options = {}) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${CURRENCY_SYMBOL} 0`
  const { decimals = 0, showCode = false } = options
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
  const core = `${CURRENCY_SYMBOL} ${formatted}`
  return showCode ? `${core} (${CURRENCY_CODE})` : core
}

export function currencySymbolWithSpace() {
  return `${CURRENCY_SYMBOL} `
}
