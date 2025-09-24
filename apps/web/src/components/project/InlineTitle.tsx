import React, { useEffect, useState } from 'react'

export default function InlineTitle({
  title,
  onChange,
  onSave,
}: {
  title: string
  onChange: (val: string) => void
  onSave: (val: string) => Promise<void> | void
}) {
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => setValue(title), [title])

  useEffect(() => {
    if (value === title) {
      return
    }
    let resetTimeout: number | null = null
    const id = window.setTimeout(async () => {
      try {
        setSaving('saving')
        onChange(value)
        await onSave(value)
        setSaving('saved')
        resetTimeout = window.setTimeout(() => setSaving('idle'), 800)
      } catch {
        setSaving('idle')
      }
    }, 600)
    return () => {
      window.clearTimeout(id)
      if (resetTimeout !== null) {
        window.clearTimeout(resetTimeout)
      }
    }
  }, [onChange, onSave, title, value])

  return (
    <div className="flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-transparent text-2xl font-semibold outline-none focus:border-b focus:border-zinc-300"
      />
      <span className="text-xs text-zinc-500 min-w-16 text-right">
        {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : ''}
      </span>
    </div>
  )
}

