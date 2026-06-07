const DEFAULT_ITEMS = [
  { icon: '✓', label: 'Verified specialists' },
  { icon: '🔒', label: 'Secure records' },
  { icon: '💳', label: 'Safe online payment' },
  { icon: '🕐', label: '24/7 patient portal' },
]

export default function TrustBar({ items = DEFAULT_ITEMS, className = '' }) {
  return (
    <div className={`dh-hospital-strip ${className}`}>
      {items.map((item) => (
        <span key={item.label} className="dh-trust-pill">
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </span>
      ))}
    </div>
  )
}
