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

function NewProjectPage() {
    const navigate = useNavigate({ from: "/projects/new" });
    const [title, setTitle] = useState("");
    const [transcript, setTranscript] = useState("");
    const [submitting, setSubmitting] = useState(false);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">New Project</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Paste Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="form-field">
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
                        <div className="form-field">
                            <Label htmlFor="transcript">Transcript</Label>
                            <Textarea
                                id="transcript"
                                placeholder="Paste the transcript text here..."
                                className="min-h-[240px]"
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
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
