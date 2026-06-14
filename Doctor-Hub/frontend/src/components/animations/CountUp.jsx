import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function parseNumericValue(value) {
  const text = String(value ?? '').trim()
  if (!text || text.includes('/')) return null
  const match = text.match(/^(\d+(?:\.\d+)?)(\+|%)?$/)
  if (!match) return null
  return {
    end: parseFloat(match[1]),
    suffix: match[2] || '',
  }
}

/**
 * Count-up animation when scrolled into view.
 * Non-numeric values (e.g. "24/7", "Verified") render as-is.
 * Touch devices show the final value immediately to avoid flicker on mobile.
 */
export default function CountUp({
  value,
  duration = 1.6,
  className = '',
  as: Tag = 'span',
}) {
  const reduceMotion = useReducedMotion()
  const preferStatic = reduceMotion || isTouchDevice()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' })
  const parsed = parseNumericValue(value)
  const finishedRef = useRef(false)
  const [display, setDisplay] = useState(() => {
    if (!parsed) return value
    return preferStatic ? parsed.end : 0
  })

  useEffect(() => {
    if (!parsed || finishedRef.current) return

    if (preferStatic) {
      setDisplay(parsed.end)
      finishedRef.current = true
      return
    }

    if (!inView) return

    finishedRef.current = true
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
  }, [inView, preferStatic, parsed, duration])

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
