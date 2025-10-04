import { jsxs, jsx } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from './card-CfKRZr7Z.mjs';
import { L as Label } from './label-BEo6Trm4.mjs';
import { I as Input, T as Textarea } from './textarea-Ceb-IS9T.mjs';
import { B as Button, p as projectsCreate } from './router-DdLUJ7j2.mjs';
import { useState } from 'react';
import { toast } from 'sonner';
import '@radix-ui/react-label';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import 'lucide-react';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import '@tanstack/react-query';
import 'axios';
import 'zod';
import 'next-themes';

function NewProjectPage() {
  const navigate = useNavigate({
    from: "/projects/new"
  });
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-4", children: "New Project" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Paste Transcript" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "title", children: "Title (optional)" }),
          /* @__PURE__ */ jsx(Input, { id: "title", placeholder: "e.g. Coaching call with Acme Corp", value: title, onChange: (e) => setTitle(e.target.value) }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: "Leave blank to auto-generate a title using AI." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "transcript", children: "Transcript" }),
          /* @__PURE__ */ jsx(Textarea, { id: "transcript", placeholder: "Paste the transcript text here...", className: "min-h-[240px]", value: transcript, onChange: (e) => setTranscript(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, disabled: submitting, children: /* @__PURE__ */ jsx(Link, { to: "/projects", children: "Cancel" }) }),
          /* @__PURE__ */ jsx(Button, { disabled: !transcript.trim() || submitting, onClick: async () => {
            try {
              setSubmitting(true);
              const payload = {
                transcript
              };
              if (title.trim()) {
                payload.title = title.trim();
              }
              const {
                project
              } = await projectsCreate(payload);
              toast.success("Project created. Processing will start shortly.");
              navigate({
                to: `/projects/${project.id}`
              });
            } catch (err) {
              if (err && typeof err === "object" && "error" in err && typeof err.error === "string") {
                toast.error(err.error);
              } else {
                toast.error("Failed to create project");
              }
            } finally {
              setSubmitting(false);
            }
          }, children: submitting ? "Creating\u2026" : "Continue" })
        ] })
      ] }) })
    ] })
  ] });
}

export { NewProjectPage as component };
//# sourceMappingURL=projects.new-BbjaqVIk.mjs.map
