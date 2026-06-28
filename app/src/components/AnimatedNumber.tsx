import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

export default function AnimatedNumber({ value, className = '' }: { value: number, className?: string }) {
  const springValue = useSpring(value, { stiffness: 100, damping: 30 })
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest))
    })
  }, [springValue])

  return (
    <motion.span className={className}>
      {displayValue.toLocaleString()}
    </motion.span>
  )
}
