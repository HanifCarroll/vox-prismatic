import React, { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'

export default function HashtagEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  useEffect(() => {
    // keep as controlled only by value for chips
  }, [value])

  const commitDraft = () => {
    const raw = draft.trim()
    if (!raw) return
    const tokens = raw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .map((t) => t.replace(/\s+/g, ''))
    const next = Array.from(new Set([...value, ...tokens]))
    onChange(next)
    setDraft('')
  }

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onChange(next)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
      if (draft.trim().length > 0) {
        e.preventDefault()
        commitDraft()
      }
    } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="mt-5 form-field">
      <Label className="block">Hashtags</Label>
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
        {value.map((tag, idx) => (
          <span
            key={tag + idx}
            className="inline-flex items-center gap-1 rounded-full border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-800"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="text-zinc-500 hover:text-zinc-800"
              onClick={() => removeAt(idx)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          placeholder={value.length === 0 ? '#ai #startups #product' : ''}
        />
      </div>
      <div className="text-[11px] text-zinc-500">Aim for 3–5 relevant hashtags.</div>
    </div>
  )
}
