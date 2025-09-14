import { createRoute, useNavigate } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'

function NewProjectPage() {
  const navigate = useNavigate({ from: '/projects/new' })
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">New Project</h1>
      <Card>
        <CardHeader>
          <CardTitle>Paste Transcript (MVP)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g. Coaching call with Acme Corp"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="text-xs text-zinc-500">
                Leave blank to auto-generate a title using AI.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                placeholder="Paste the transcript text here..."
                className="min-h-[240px]"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className="text-xs text-zinc-500">
                Only transcript text is supported in the MVP.
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" asChild>
                <a href="/projects">Cancel</a>
              </Button>
              <Button
                disabled={!transcript.trim()}
                onClick={() => {
                  toast.success('Project created. Processing will start shortly.')
                  navigate({ to: '/projects' })
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/projects/new',
    component: NewProjectPage,
    getParentRoute: () => parentRoute,
  })
