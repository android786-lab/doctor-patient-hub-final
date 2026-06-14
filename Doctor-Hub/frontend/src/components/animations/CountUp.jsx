import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

function parseNumericValue(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    end: parseFloat(match[1]),
    suffix: match[2] || '',
  }
}

/**
 * Count-up animation when scrolled into view.
 * Non-numeric values (e.g. "Verified") render as-is.
 */
export default function CountUp({
  value,
  duration = 1.6,
  className = '',
  as: Tag = 'span',
}) {
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const parsed = parseNumericValue(value)
  const [display, setDisplay] = useState(parsed ? 0 : value)

  useEffect(() => {
    if (!parsed) return

    if (reduceMotion || !inView) {
      setDisplay(parsed.end)
      return
    }

    let frameId
    const startTime = performance.now()
    const ms = duration * 1000

    const tick = (now) => {
      const progress = Math.min((now - startTime) / ms, 1)
      const eased = 1 - (1 - progress) ** 3
      const current = parsed.end % 1 === 0
        ? Math.round(parsed.end * eased)
        : Math.round(parsed.end * eased * 10) / 10
      setDisplay(current)
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [inView, reduceMotion, parsed, duration])

  if (!parsed) {
    return <Tag className={className}>{value}</Tag>
  }

  const formatted = parsed.end % 1 === 0 ? Math.round(display) : display

  return (
    <Tag ref={ref} className={className}>
      {formatted}
      {parsed.suffix}
    </Tag>
  )
}
