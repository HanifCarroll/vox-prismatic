import { AnimatePresence, motion } from 'motion/react'

export function LoadingOverlay({ message = 'Loading…' }: { message?: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="absolute inset-0 z-[10] bg-zinc-50/90"
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.3 } }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 rounded-full bg-zinc-900" />
          <div className="text-sm text-zinc-600">{message}</div>
          <div className="h-1 w-48 overflow-hidden rounded bg-zinc-200">
            <motion.div
              className="h-full w-1/3 bg-zinc-900"
              animate={{ x: ['0%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

