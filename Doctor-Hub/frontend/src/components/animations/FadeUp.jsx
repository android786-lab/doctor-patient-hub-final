import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT, viewportOnce } from './motionPresets.js'

/**
 * Scroll-reveal fade-up wrapper. Respects prefers-reduced-motion.
 */
export default function FadeUp({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  y = 24,
  as = 'div',
  once = true,
  ...props
}) {
  const reduceMotion = useReducedMotion()
  const motionMap = { div: motion.div, section: motion.section, footer: motion.footer }
  const tagMap = { div: 'div', section: 'section', footer: 'footer' }
  const Component = motionMap[as] || motion.div

  if (reduceMotion) {
    const Tag = tagMap[as] || 'div'
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={once ? viewportOnce : { margin: '-40px' }}
      transition={{ duration, delay, ease: EASE_OUT }}
      {...props}
    >
      {children}
    </Component>
  )
}
