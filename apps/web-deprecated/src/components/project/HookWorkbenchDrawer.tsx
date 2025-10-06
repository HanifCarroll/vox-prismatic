import { useEffect, useMemo, useState } from 'react'
import type { Post } from '@/api/types'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import type { HookFramework, HookWorkbenchHook } from '@/api/types'
import { postsHookWorkbench } from '@/api/posts/posts'
import type { ApiError } from '@/lib/client/base'
import { useHookFrameworks } from '@/hooks/queries/useHookFrameworks'
import { deriveHookFromContent, mergeHookIntoContent } from './utils'

type HookWorkbenchDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post | null
  baseContent: string
  onApplyHook: (hook: string) => void
}

function limitSelection(current: string[], nextId: string, checked: boolean) {
  if (checked) {
    if (current.includes(nextId)) {
      return current
    }
    if (current.length >= 5) {
      return current
    }
    return [...current, nextId]
  }
  return current.filter((id) => id !== nextId)
}

export default function HookWorkbenchDrawer({
  open,
  onOpenChange,
  post,
  baseContent,
  onApplyHook,
}: HookWorkbenchDrawerProps) {
  const frameworksQuery = useHookFrameworks(open)
  const frameworks = frameworksQuery.data?.frameworks ?? []
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([])
  const [customFocus, setCustomFocus] = useState('')
  const [count, setCount] = useState(3)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    if (open && frameworks.length && selectedFrameworkIds.length === 0) {
      const defaults = frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id)
      setSelectedFrameworkIds(defaults)
    }
  }, [open, frameworks, selectedFrameworkIds.length])

  useEffect(() => {
    if (!open) {
      setPreviewId(null)
      setCustomFocus('')
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (vars: { frameworkIds?: string[]; customFocus?: string; count?: number }) => {
      if (!post) {
        throw new Error('No post selected')
      }
      return postsHookWorkbench(post.id, vars)
    },
    onError: (error: ApiError | Error) => {
      const message =
        'error' in error ? (error as ApiError).error || 'Failed to generate hooks' : error.message
      toast.error(message)
    },
  })

  const hooks = mutation.data?.hooks ?? []

  useEffect(() => {
    if (!hooks.length) {
      return
    }
    if (!previewId) {
      const first = hooks[0]
      setPreviewId(mutation.data?.recommendedId ?? first?.id ?? null)
    }
  }, [hooks, previewId, mutation.data?.recommendedId])

  const previewHook = useMemo(() => hooks.find((hook) => hook.id === previewId) ?? null, [hooks, previewId])
  const previewContent = useMemo(
    () => (previewHook ? mergeHookIntoContent(baseContent, previewHook.hook) : baseContent),
    [baseContent, previewHook],
  )

  const currentHook = useMemo(() => deriveHookFromContent(baseContent), [baseContent])

  const generateDisabled = !post || selectedFrameworkIds.length === 0 || mutation.isPending

  const handleGenerate = () => {
    if (!post) {
      return
    }
    const payload: { frameworkIds?: string[]; customFocus?: string; count?: number } = {}
    if (selectedFrameworkIds.length) {
      payload.frameworkIds = selectedFrameworkIds
    }
    if (customFocus.trim().length > 0) {
      payload.customFocus = customFocus.trim()
    }
    payload.count = count
    mutation.mutate(payload)
  }

  const handleApply = (hook: HookWorkbenchHook) => {
    onApplyHook(hook.hook)
    toast.success('Hook applied to draft')
    onOpenChange(false)
  }

  const resetSelection = () => {
    setSelectedFrameworkIds(frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id))
  }

  const recommendedId = mutation.data?.recommendedId ?? null
  const summary = mutation.data?.summary ?? null

  const FrameworkOption = ({ framework }: { framework: HookFramework }) => {
    const checked = selectedFrameworkIds.includes(framework.id)
    return (
      <div className="flex cursor-pointer flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-3 text-left hover:border-zinc-300">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) =>
              setSelectedFrameworkIds((cur) =>
                limitSelection(cur, framework.id, value === true || value === 'indeterminate'),
              )
            }
            id={`fw-${framework.id}`}
          />
          <Label htmlFor={`fw-${framework.id}`}>{framework.label}</Label>
        </div>
        <p className="text-xs leading-relaxed text-zinc-600">{framework.description}</p>
        {framework.example && (
          <p className="text-xs font-medium text-zinc-500">Example: {framework.example}</p>
        )}
      </div>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-4xl">
        <DrawerHeader className="border-b">
          <DrawerTitle>Hook workbench</DrawerTitle>
          <DrawerDescription>
            Generate hook variants grounded in your transcript insight, compare scores, and drop the winner into the draft.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
          {!post ? (
            <Card>
              <CardHeader>
                <CardTitle>No post selected</CardTitle>
                <CardDescription>Choose a post from the queue to explore hook options.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="space-y-4">
                  <Card className="gap-4">
                    <CardHeader>
                      <CardTitle className="text-base">Frameworks</CardTitle>
                      <CardDescription>Select up to five frameworks to explore.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{selectedFrameworkIds.length} selected</span>
                        <Button variant="ghost" size="sm" onClick={resetSelection} disabled={!frameworks.length}>
                          Reset
                        </Button>
                      </div>
                      <ScrollArea className="h-64 rounded-lg border bg-zinc-50">
                        <div className="space-y-3 p-3">
                          {frameworks.length === 0 && (
                            <p className="text-xs text-zinc-500">Loading frameworks…</p>
                          )}
                          {frameworks.map((framework) => (
                            <FrameworkOption key={framework.id} framework={framework} />
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">
                          Variants to generate
                        </Label>
                        <ToggleGroup
                          type="single"
                          value={String(count)}
                          onValueChange={(value) => {
                            if (!value) {
                              return
                            }
                            setCount(Number(value))
                          }}
                          className="flex gap-2"
                        >
                          {[3, 4, 5].map((option) => (
                            <ToggleGroupItem
                              key={option}
                              value={String(option)}
                              className="flex-1"
                            >
                              {option}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">
                          Focus (optional)
                        </Label>
                        <Textarea
                          value={customFocus}
                          onChange={(event) => setCustomFocus(event.target.value)}
                          placeholder="e.g. Highlight the measurable client outcome from the leadership sprint"
                          className="min-h-24 resize-none text-sm"
                          maxLength={240}
                        />
                        <div className="text-right text-xs text-zinc-400">{customFocus.length}/240</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">Current opening</Label>
                        <p className="rounded-md border bg-white p-3 text-sm leading-relaxed text-zinc-700">
                          {currentHook || 'Draft does not have an opening line yet.'}
                        </p>
                      </div>
                      <Button onClick={handleGenerate} disabled={generateDisabled} className="w-full">
                        {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Generate hooks
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4">
                  {mutation.isPending && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500">
                      Thinking through fresh hooks…
                    </div>
                  )}
                  {!mutation.isPending && hooks.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500">
                      Choose frameworks and generate to see ranked hook options.
                    </div>
                  )}
                  {summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">AI takeaways</CardTitle>
                        <CardDescription>{summary}</CardDescription>
                      </CardHeader>
                    </Card>
                  )}
                  {hooks.map((hook) => {
                    const isRecommended = recommendedId === hook.id
                    const isPreviewing = previewId === hook.id
                    return (
                      <Card key={hook.id}>
                        <CardHeader className="gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{hook.label}</Badge>
                              {isRecommended && <Badge variant="outline">Recommended</Badge>}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Curiosity {hook.curiosity} · Value {hook.valueAlignment}
                            </div>
                          </div>
                          <p className="text-base font-medium leading-snug text-zinc-900">{hook.hook}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Curiosity
                              </div>
                              <Progress value={hook.curiosity} className="h-2" />
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Value alignment
                              </div>
                              <Progress value={hook.valueAlignment} className="h-2" />
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-zinc-600">{hook.rationale}</p>
                        </CardContent>
                        <CardFooter className="justify-between gap-3">
                          <Button
                            variant={isPreviewing ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewId(hook.id)}
                          >
                            {isPreviewing ? 'Previewing' : 'Preview'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleApply(hook)}>
                            Use hook
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">A/B preview</CardTitle>
                  <CardDescription>
                    Compare how the selected hook rewrites the opening before committing it to the post.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border bg-white p-4 text-sm leading-relaxed text-zinc-700">
                    {previewHook ? previewContent : 'Select a hook to preview the updated draft.'}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
