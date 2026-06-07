/** Clinic wallet details shown to patients for manual transfer */
export const MANUAL_PAYMENT_ACCOUNT_NAME = 'Hamza Shoukat'

export const MANUAL_PAYMENT_WALLETS = [
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    number: '03297354042',
    note: 'Also use this number for SadaPay & NayaPay',
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    number: '03178110476',
    note: null,
  },
]

export const MANUAL_PAYMENT_METHODS = [
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'sadapay', label: 'SadaPay' },
  { value: 'nayapay', label: 'NayaPay' },
  { value: 'jazzcash', label: 'JazzCash' },
]
