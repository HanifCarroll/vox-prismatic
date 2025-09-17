import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export function LoadingOverlay({ message = 'Loading…' }: { message?: string }) {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useEffect(() => {
    function measure() {
      const main = document.querySelector('main') as HTMLElement | null
      if (!main) {
        setRect(null)
        return
      }
      const r = main.getBoundingClientRect()
      const styles = window.getComputedStyle(main)
      const pl = Number.parseFloat(styles.paddingLeft || '0') || 0
      const pr = Number.parseFloat(styles.paddingRight || '0') || 0
      setRect({ left: r.left + pl, top: r.top, width: r.width - pl - pr, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [])

  const overlay = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="z-[50] bg-zinc-50/90"
        style={{
          position: 'fixed',
          left: rect?.left ?? 0,
          top: rect?.top ?? 0,
          width: rect?.width ?? '100vw',
          height: rect?.height ?? '100vh',
        }}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.3 } }}
          className="flex h-full w-full items-center justify-center"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-900" />
            <div className="text-sm text-zinc-600">{message}</div>
            <div className="h-1 w-48 overflow-hidden rounded bg-zinc-200">
              <motion.div
                className="h-full w-1/3 bg-zinc-900"
                animate={{ x: ['0%', '66%'] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, repeatType: 'reverse', duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
  const main = typeof document !== 'undefined' ? document.querySelector('main') : null
  return main ? createPortal(overlay, main) : overlay
}
