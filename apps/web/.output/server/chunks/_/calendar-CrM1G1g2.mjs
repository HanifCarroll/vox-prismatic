import { jsxs, jsx } from 'react/jsx-runtime';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from './card-PfEJvKqD.mjs';
import { format } from 'date-fns';
import { i as Route$7 } from './router-6_mKVCnu.mjs';
import '@tanstack/react-router';
import 'react';
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
import 'sonner';

function CalendarPage() {
  const data = Route$7.useLoaderData();
  const items = data.items;
  return /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Scheduled Posts" }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-600", children: "Upcoming scheduled posts (read-only)." })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { children: [
        "Next ",
        items.length,
        " posts"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: items.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "No scheduled posts." }) : /* @__PURE__ */ jsx("div", { className: "divide-y", children: items.map((p) => /* @__PURE__ */ jsxs("div", { className: "py-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-zinc-800", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Post" }),
          /* @__PURE__ */ jsx("div", { className: "text-zinc-600 truncate max-w-xl", children: p.content })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-700", children: p.scheduledAt ? format(new Date(p.scheduledAt), "PPpp") : "" })
      ] }, p.id)) }) })
    ] })
  ] });
}

export { CalendarPage as component };
//# sourceMappingURL=calendar-CrM1G1g2.mjs.map
