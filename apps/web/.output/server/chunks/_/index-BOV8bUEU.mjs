import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Users, Workflow, Sparkles, ShieldCheck } from 'lucide-react';
import { f as useAuth, B as Button } from './router-DdLUJ7j2.mjs';
import { B as Badge } from './badge-BS9Bs1i7.mjs';
import { C as Card, c as CardContent } from './card-CfKRZr7Z.mjs';
import 'react';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
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

const differentiators = [{
  title: "Fractional-ready cockpit",
  description: "Keep every portfolio company and advisory client on one board that surfaces what needs your executive voice next.",
  icon: Workflow
}, {
  title: "AI tuned for executive POV",
  description: "Our engine writes from the perspective you bring to the boardroom, pulling sharp hooks and takeaways straight from your calls.",
  icon: Sparkles
}, {
  title: "Guardrails for brand-critical posts",
  description: "Retain human control over every draft. Approve, delegate, or schedule only when the narrative matches your mandate.",
  icon: ShieldCheck
}];
const processSteps = [{
  title: "Drop in a board update or founder briefing",
  detail: "Upload transcripts, Loom links, or your chief of staff\u2019s notes. We auto-structure context around the initiative you led."
}, {
  title: "Review drafts built for executive-level storytelling",
  detail: "Scan 5\u201310 posts that translate your guidance into strategic narratives. Mark what ships, what needs polish, and what to delegate."
}, {
  title: "Publish without blocking your calendar",
  detail: "Push directly to LinkedIn or line up a month of thought leadership while you stay embedded with clients."
}];
const stats = [{
  label: "Executive hours reclaimed each month",
  value: "18+",
  explanation: "Hand off post-production while keeping your strategic fingerprints on every message."
}, {
  label: "LinkedIn posts per engagement",
  value: "5\u201310 drafts",
  explanation: "Turn one advisory call into a full campaign your network recognizes as distinctly yours."
}, {
  label: "Fractional leaders onboarded",
  value: "70+",
  explanation: "CMOs, CROs, and COOs who treat LinkedIn as their portfolio-wide town hall."
}];
const faqs = [{
  question: "How does the platform create LinkedIn posts?",
  answer: "We analyze your transcript to extract the strongest insights, then craft platform-aware drafts with hooks, context, and calls to action. Every post reflects the executive priorities you set."
}, {
  question: "Do I need to manage multiple tools?",
  answer: "No. Projects, drafts, approvals, and publishing all live in one project-centric view. Built-in status cues make it easy to see what needs your signature versus what your chief of staff can ship."
}, {
  question: "What happens after I approve a post?",
  answer: "Approved posts move into a ready state for instant publishing. LinkedIn OAuth is built in so your team can push live the moment you sign off."
}, {
  question: "Can my team collaborate?",
  answer: "Absolutely. Loop in marketing partners, portfolio operators, or ghostwriters so everyone stays aligned on status, next steps, and brand guardrails."
}];
const socialProof = ["Fractional CMOs", "Fractional CROs", "Portfolio Operations Leads", "Chiefs of Staff", "Advisory Collectives"];
function LandingPage() {
  const {
    isAuthenticated
  } = useAuth();
  const primaryCtaHref = isAuthenticated ? "/projects" : "/register";
  return /* @__PURE__ */ jsxs("div", { className: "bg-white text-zinc-900", children: [
    /* @__PURE__ */ jsx("a", { href: "#main-content", className: "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white", children: "Skip to content" }),
    /* @__PURE__ */ jsx("header", { className: "border-b border-zinc-200", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-5", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 text-lg font-semibold", children: [
        /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-lg bg-blue-600", "aria-hidden": "true" }),
        "Content Projects"
      ] }),
      /* @__PURE__ */ jsx("nav", { className: "flex items-center gap-4 text-sm", children: isAuthenticated ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/projects", className: "text-zinc-600 transition-colors hover:text-zinc-900", children: "Workspace" }),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs(Link, { to: "/projects/new", className: "flex items-center gap-1", children: [
          "New project",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
        ] }) })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/login", className: "text-zinc-600 transition-colors hover:text-zinc-900", children: "Log in" }),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs(Link, { to: "/register", className: "flex items-center gap-1", children: [
          "Start free",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
        ] }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-16", children: [
      /* @__PURE__ */ jsxs("section", { className: "grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "border-blue-200 bg-blue-50 text-blue-700", children: "Built for fractional executives" }),
          /* @__PURE__ */ jsx("h1", { className: "text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl", children: "Own LinkedIn without owning the calendar." }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-600", children: "Content Projects gives fractional executives a project-centric workflow that transforms board updates, portfolio wins, and advisory calls into ready-to-publish LinkedIn posts\u2014without late-night writing sprints." }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "h-12 px-6 text-base", children: /* @__PURE__ */ jsxs(Link, { to: primaryCtaHref, className: "flex items-center gap-2", children: [
              isAuthenticated ? "Go to projects" : "Start leading on LinkedIn",
              /* @__PURE__ */ jsx(ArrowRight, { className: "h-5 w-5" })
            ] }) }),
            isAuthenticated ? /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "lg", className: "h-12 border-zinc-300 px-6 text-base", children: /* @__PURE__ */ jsx(Link, { to: "/projects/new", className: "flex items-center gap-2", children: "Create new project" }) }) : /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "lg", className: "h-12 border-zinc-300 px-6 text-base", children: /* @__PURE__ */ jsx("a", { href: "#process-heading", className: "flex items-center gap-2", children: "See how it works" }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4 text-sm text-zinc-500", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500" }),
              "Your executive voice stays in every draft"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500" }),
              "Delegate reviews without another toolchain"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative isolate overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm", children: [
          /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-blue-100 opacity-70 blur-3xl" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-zinc-500", children: "Active engagement" }),
                /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold text-zinc-900", children: "Portfolio sync \xB7 Series B fintech" })
              ] }),
              /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "bg-emerald-100 text-emerald-700", children: "Ready" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-dashed border-zinc-200 bg-white p-4 shadow-sm", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-zinc-500", children: "LinkedIn draft" }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 text-base font-medium text-zinc-900", children: "\u201CFractional doesn\u2019t mean part-time influence. Here\u2019s how we turned a board fire drill into a customer story our network couldn\u2019t stop sharing.\u201D" }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-between text-sm text-zinc-500", children: [
                /* @__PURE__ */ jsx("span", { children: "Character count: 1,182" }),
                /* @__PURE__ */ jsx("span", { children: "Stage: Drafts \u2192 Exec review" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-zinc-500", children: [
              /* @__PURE__ */ jsx("span", { children: "Briefing processed via SSE \xB7 3 mins ago" }),
              /* @__PURE__ */ jsx("span", { children: "4 drafts awaiting your green light" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "social-proof-heading", className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-4 w-4", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { id: "social-proof-heading", children: "Trusted by fractional leaders" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-6 text-base text-zinc-500", children: socialProof.map((group) => /* @__PURE__ */ jsx("span", { className: "whitespace-nowrap rounded-full border border-zinc-200 px-4 py-2", children: group }, group)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "differentiators-heading", className: "space-y-12", children: [
        /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "differentiators-heading", className: "text-3xl font-semibold text-zinc-900", children: "Replace disconnected tools with a workflow that keeps you visible while you operate." }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-600", children: "Content Projects removes the manual labor of turning calls into content so you can focus on steering portfolio strategy, not polishing posts." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-6 md:grid-cols-3", children: differentiators.map(({
          title,
          description,
          icon: Icon
        }) => /* @__PURE__ */ jsx(Card, { className: "h-full border-zinc-200 shadow-sm", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex h-full flex-col gap-4 p-6", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-blue-50", children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6 text-blue-600", "aria-hidden": "true" }) }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-zinc-900", children: title }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: description })
          ] })
        ] }) }, title)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "process-heading", className: "grid gap-10 lg:grid-cols-[0.6fr_1fr] lg:items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "process-heading", className: "text-3xl font-semibold text-zinc-900", children: "Ship LinkedIn content without breaking stride." }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-600", children: "Guided stages keep every engagement moving\u2014from first briefing to scheduled post\u2014with clarity on who owns the next action." }),
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "h-12 w-fit px-6 text-base", children: /* @__PURE__ */ jsx(Link, { to: primaryCtaHref, children: "See it in action" }) })
        ] }),
        /* @__PURE__ */ jsx("ol", { className: "space-y-6", children: processSteps.map((step, index) => /* @__PURE__ */ jsx("li", { className: "rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("span", { className: "mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white", children: index + 1 }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-zinc-900", children: step.title }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: step.detail })
          ] })
        ] }) }, step.title)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "results-heading", className: "space-y-12", children: [
        /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "results-heading", className: "text-3xl font-semibold text-zinc-900", children: "Fractional executives convert conversations into influence faster." }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-600", children: "See the compound impact when each strategic call fuels LinkedIn content that keeps every stakeholder looped in." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-6 md:grid-cols-3", children: stats.map((stat) => /* @__PURE__ */ jsx(Card, { className: "h-full border-zinc-200 shadow-sm", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex h-full flex-col gap-3 p-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium uppercase tracking-[0.2em] text-zinc-500", children: stat.label }),
          /* @__PURE__ */ jsx("p", { className: "text-4xl font-semibold text-zinc-900", children: stat.value }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: stat.explanation })
        ] }) }, stat.label)) })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "testimonial-heading", className: "rounded-3xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-blue-50 p-10 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-6", children: [
        /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "bg-zinc-900 text-white", children: "Customer spotlight" }),
        /* @__PURE__ */ jsx("h2", { id: "testimonial-heading", className: "text-3xl font-semibold text-zinc-900", children: "\u201CWe translate portfolio wins into LinkedIn narratives before the next standup even starts.\u201D" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-700", children: "\u201CBefore Content Projects I was copying field notes into docs on Friday nights. Now I forward a briefing, review aligned drafts in minutes, and my network sees the signal the same day. It\u2019s the operating system that keeps every portfolio company aligned with my executive narrative.\u201D" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-zinc-600", children: "\u2014 Priya Raman, Fractional CMO at Signal North Collective" })
      ] }) }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "faq-heading", className: "space-y-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "faq-heading", className: "text-3xl font-semibold text-zinc-900", children: "Frequently asked questions" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-600", children: "Everything you need to know before turning your advisory calls into a consistent executive presence." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-6", children: faqs.map((faq) => /* @__PURE__ */ jsx(Card, { className: "border-zinc-200", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2 p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-zinc-900", children: faq.question }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: faq.answer })
        ] }) }, faq.question)) })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "cta-heading", className: "rounded-3xl border border-zinc-200 bg-zinc-900 p-10 text-white shadow-lg", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "cta-heading", className: "text-3xl font-semibold", children: "Ready to ship LinkedIn thought leadership on autopilot?" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-zinc-200", children: "Launch your first project in minutes. Import a briefing, review AI drafts, and publish to LinkedIn before the next board packet lands." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "secondary", className: "h-12 px-6 text-base text-zinc-900", children: /* @__PURE__ */ jsxs(Link, { to: primaryCtaHref, className: "flex items-center gap-2", children: [
            isAuthenticated ? "Go to projects" : "Start as a fractional leader",
            /* @__PURE__ */ jsx(ArrowRight, { className: "h-5 w-5" })
          ] }) }),
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "h-12 border-white px-6 text-base text-white", children: /* @__PURE__ */ jsx("a", { href: "mailto:hello@contentprojects.com", children: "Talk with sales" }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-zinc-200 bg-zinc-50", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "\xA9 ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Content Projects. All rights reserved."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
        /* @__PURE__ */ jsx(Link, { to: "/login", className: "hover:text-zinc-700", children: "Log in" }),
        /* @__PURE__ */ jsx(Link, { to: "/register", className: "hover:text-zinc-700", children: "Create account" }),
        /* @__PURE__ */ jsx("a", { href: "mailto:hello@contentprojects.com", className: "hover:text-zinc-700", children: "Contact" })
      ] })
    ] }) })
  ] });
}

export { LandingPage as component };
//# sourceMappingURL=index-BOV8bUEU.mjs.map
