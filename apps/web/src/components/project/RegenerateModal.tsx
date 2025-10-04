import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PostTypePreset } from '@/api/types'

export type RegenerateModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (opts: { customInstructions?: string; postType?: PostTypePreset }) => void
  disabled?: boolean
}

export default function RegenerateModal({ open, onOpenChange, onSubmit, disabled }: RegenerateModalProps) {
  const [customInstructions, setCustomInstructions] = useState('')
  const [postType, setPostType] = useState<PostTypePreset | undefined>(undefined)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white p-4 shadow">
          <Dialog.Title className="text-lg font-medium mb-2">Regenerate with custom instructions</Dialog.Title>
          <div className="space-y-3">
            <div className="form-field">
              <Label htmlFor="regen-posttype">Post type (optional)</Label>
              <Select value={postType || ''} onValueChange={(v) => setPostType(v as PostTypePreset)}>
                <SelectTrigger id="regen-posttype"><SelectValue placeholder="Select a preset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="how_to">How-to</SelectItem>
                  <SelectItem value="myth_bust">Myth-bust</SelectItem>
                  <SelectItem value="listicle">Listicle</SelectItem>
                  <SelectItem value="case_study">Case study</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="regen-custom">Custom instructions (optional)</Label>
              <Textarea
                id="regen-custom"
                className="h-40"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add specific guidance for this regenerate run…"
              />
              <div className="mt-1 text-xs text-zinc-500">You can leave fields blank to reuse your default style.</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.Close>
            <Button
              disabled={disabled}
              onClick={() => {
                onSubmit({
                  customInstructions: customInstructions.trim() ? customInstructions : undefined,
                  postType,
                })
                onOpenChange(false)
              }}
            >
              Regenerate
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
