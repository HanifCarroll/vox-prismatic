import { createFileRoute, useNavigate, redirect, isRedirect, Link } from "@tanstack/react-router";
import { getSession } from "@/lib/session";
import { handleAuthGuardError } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { projectsCreate } from '@/api/projects/projects'
import type { ProjectsCreateBody } from '@/api/generated.schemas'
import defaultTranscriptData from '@/data/default-transcript.json'

function NewProjectPage() {
    const navigate = useNavigate({ from: "/projects/new" });
    const [title, setTitle] = useState("");
    const [transcript, setTranscript] = useState(defaultTranscriptData.transcript);
    const [submitting, setSubmitting] = useState(false);

    return (
        <div className="h-screen flex flex-col p-6">
            <h1 className="text-2xl font-semibold mb-4 flex-shrink-0">New Project</h1>
            <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0">
                    <CardTitle>Paste Transcript</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0">
                    <div className="flex flex-col h-full space-y-4">
                        <div className="form-field flex-shrink-0">
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
                        <div className="form-field flex-1 flex flex-col min-h-0">
                            <Label htmlFor="transcript" className="mb-2">Transcript</Label>
                            <Textarea
                                id="transcript"
                                placeholder="Paste the transcript text here..."
                                className="flex-1 resize-none"
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                asChild
                                disabled={submitting}
                            >
                                <Link to="/projects">Cancel</Link>
                            </Button>
                            <Button
                                disabled={!transcript.trim() || submitting}
                                onClick={async () => {
                                    try {
                                        setSubmitting(true);
                                        const payload: ProjectsCreateBody = {
                                            transcript,
                                        }
                                        if (title.trim()) {
                                            payload.title = title.trim();
                                        }
                                        const { project } = await projectsCreate(payload)
                                        toast.success(
                                            "Project created. Processing will start shortly.",
                                        );
                                        navigate({
                                            to: `/projects/${project.id}`,
                                        });
                                    } catch (err: unknown) {
                                        if (
                                            err &&
                                            typeof err === "object" &&
                                            "error" in err &&
                                            typeof (err as { error?: unknown }).error === "string"
                                        ) {
                                            toast.error((err as { error: string }).error);
                                        } else {
                                            toast.error("Failed to create project");
                                        }
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {submitting ? "Creating…" : "Continue"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute("/projects/new")({
  ssr: false,
  component: NewProjectPage,
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({ to: "/login" });
      }
    }
  },
});
