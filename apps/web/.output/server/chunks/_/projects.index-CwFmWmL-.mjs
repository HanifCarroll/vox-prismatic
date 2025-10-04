import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { B as Badge } from './badge-BS9Bs1i7.mjs';
import { P as ProjectDeleteButton, a as Progress } from './ProjectDeleteButton-CejiN9cZ.mjs';
import { useState } from 'react';
import { o as Route$3 } from './router-DdLUJ7j2.mjs';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import '@radix-ui/react-progress';
import '@radix-ui/react-alert-dialog';
import '@tanstack/react-query';
import 'sonner';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import 'lucide-react';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import 'axios';
import 'zod';
import 'next-themes';

function StageBadge({
  stage
}) {
  const map = {
    processing: {
      label: "Processing",
      variant: "secondary"
    },
    posts: {
      label: "Posts",
      variant: "default"
    },
    ready: {
      label: "Ready",
      variant: "default"
    }
  };
  return /* @__PURE__ */ jsx(Badge, { variant: map[stage].variant, children: map[stage].label });
}
function ProjectsIndexPage() {
  const data = Route$3.useLoaderData();
  const [items, setItems] = useState(data.items);
  return /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-4", children: "Projects" }),
    items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-16 flex flex-col items-center text-center text-zinc-600", children: [
      /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", className: "h-12 w-12 text-zinc-400 mb-3", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", role: "img", "aria-labelledby": "projects-empty-icon-title", children: [
        /* @__PURE__ */ jsx("title", { id: "projects-empty-icon-title", children: "Empty projects illustration" }),
        /* @__PURE__ */ jsx("path", { d: "M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" }),
        /* @__PURE__ */ jsx("path", { d: "M3 7V5a 2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v3" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-lg font-medium text-zinc-800", children: "No projects yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-md text-sm", children: "Spin up your first project to turn a transcript or URL into a set of LinkedIn-ready posts." }),
      /* @__PURE__ */ jsx(Link, { to: "/projects/new", className: "mt-4 inline-flex", children: /* @__PURE__ */ jsx("span", { className: "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50", children: "Create your first project" }) })
    ] }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: items.map((p) => {
      var _a, _b;
      return /* @__PURE__ */ jsxs("li", { className: "border rounded p-3 hover:bg-zinc-50", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsx(Link, { to: "/projects/$projectId", params: {
            projectId: String(p.id)
          }, className: "font-medium text-zinc-900 truncate", children: p.title }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(StageBadge, { stage: p.currentStage }),
            /* @__PURE__ */ jsx(ProjectDeleteButton, { projectId: p.id, projectTitle: p.title, onDeleted: () => setItems((cur) => cur.filter((x) => x.id !== p.id)) })
          ] })
        ] }),
        p.currentStage === "processing" && /* @__PURE__ */ jsxs("div", { className: "mt-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-zinc-500", children: [
            /* @__PURE__ */ jsx("div", { children: "Processing\u2026" }),
            /* @__PURE__ */ jsxs("div", { children: [
              (_a = p.processingProgress) != null ? _a : 0,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Progress, { value: (_b = p.processingProgress) != null ? _b : 0, className: "mt-1 h-1" })
        ] })
      ] }, p.id);
    }) })
  ] });
}

export { ProjectsIndexPage as component };
//# sourceMappingURL=projects.index-CwFmWmL-.mjs.map
