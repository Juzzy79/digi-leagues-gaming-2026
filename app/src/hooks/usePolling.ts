import { useEffect } from 'react'

/**
 * Reusable polling hook to run a callback at a specified interval.
 * It strictly calls the callback once immediately on mount, then sets the interval.
 */
export function usePolling(callback: () => void, intervalMs: number) {
  useEffect(() => {
    callback()
    const interval = setInterval(callback, intervalMs)
    return () => clearInterval(interval)
  }, [callback, intervalMs])
}
