import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'

export interface TextareaAutosizeProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
  maxRows?: number
}

export const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ minRows = 3, maxRows = 20, style, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

    const resize = React.useCallback(() => {
      const el = innerRef.current
      if (!el) {
        return
      }
      el.style.height = 'auto'
      const lineHeight = Number.parseInt(window.getComputedStyle(el).lineHeight || '20', 10)
      const minH = minRows * lineHeight
      const maxH = maxRows * lineHeight
      const next = Math.max(minH, Math.min(el.scrollHeight, maxH))
      el.style.height = `${next}px`
    }, [minRows, maxRows])

    React.useLayoutEffect(() => {
      resize()
    })

    return (
      <Textarea
        {...props}
        ref={(node) => {
          innerRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          }
        }}
        // Allow scrolling when we hit the computed max height
        style={{ overflow: 'auto', overflowY: 'auto', ...style }}
        onChange={(e) => {
          onChange?.(e)
          resize()
        }}
      />
    )
  },
)

TextareaAutosize.displayName = 'TextareaAutosize'
