import { useEffect, useRef } from 'react'

/**
 * Reusable polling hook to run a callback at a specified interval.
 * Uses recursive setTimeout to prevent race conditions and excessive DB hits.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    
    const executePoll = async () => {
      if (!isMounted.current) return
      
      try {
        await callback()
      } catch (error) {
        console.error('Polling error:', error)
      }
      
      if (isMounted.current) {
        timeoutRef.current = setTimeout(executePoll, intervalMs)
      }
    }

    executePoll()

    return () => {
      isMounted.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [callback, intervalMs])
}
