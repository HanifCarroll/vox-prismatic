import { jsxs, jsx } from 'react/jsx-runtime';
import { format } from 'date-fns';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from './card-CfKRZr7Z.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from './table-DQ7W_1Xw.mjs';
import { B as Badge } from './badge-BS9Bs1i7.mjs';
import { j as Route$6 } from './router-DdLUJ7j2.mjs';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import '@tanstack/react-router';
import 'react';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import 'lucide-react';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import '@tanstack/react-query';
import 'axios';
import 'zod';
import 'next-themes';
import 'sonner';

const numberFormatter = new Intl.NumberFormat(void 0, {
  maximumFractionDigits: 0
});
const decimalFormatter = new Intl.NumberFormat(void 0, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
function SummaryCard({
  title,
  value,
  description
}) {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-zinc-500", children: title }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "pt-0", children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-zinc-900", children: value }),
      description ? /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 mt-1", children: description }) : null
    ] })
  ] });
}
function AnalyticsPage() {
  const data = Route$6.useLoaderData();
  const {
    summary,
    daily,
    topHashtags
  } = data;
  const recentDaily = daily.slice(-Math.min(14, daily.length));
  const averageLabel = summary.averageTimeToPublishHours === null ? "\u2014" : `${decimalFormatter.format(summary.averageTimeToPublishHours)} hrs`;
  const statusMeta = [{
    key: "pending",
    label: "Pending review",
    tone: "muted"
  }, {
    key: "approved",
    label: "Approved",
    tone: "default"
  }, {
    key: "rejected",
    label: "Rejected",
    tone: "muted"
  }, {
    key: "published",
    label: "Published",
    tone: "default"
  }];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-zinc-900", children: "Analytics" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-zinc-600", children: [
        "Track how your LinkedIn posts are performing over the last ",
        summary.rangeDays,
        " days."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsx(SummaryCard, { title: "Total posts", value: numberFormatter.format(summary.totalPosts) }),
      /* @__PURE__ */ jsx(SummaryCard, { title: `Published (last ${summary.rangeDays} days)`, value: numberFormatter.format(summary.publishedInPeriod) }),
      /* @__PURE__ */ jsx(SummaryCard, { title: "Scheduled", value: numberFormatter.format(summary.scheduledCount) }),
      /* @__PURE__ */ jsx(SummaryCard, { title: "Avg. time to publish", value: averageLabel })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Status breakdown" }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-3", children: statusMeta.map((item) => {
          const value = summary.statusCounts[item.key];
          return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx(Badge, { variant: item.tone === "muted" ? "outline" : "default", className: "uppercase tracking-wide", children: item.label }) }),
            /* @__PURE__ */ jsx("span", { className: "font-medium text-zinc-900", children: numberFormatter.format(value) })
          ] }, item.key);
        }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Top hashtags" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: topHashtags.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: "No hashtags yet. Add hashtags to your posts to see trends." }) : /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { className: "w-16", children: "#" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Hashtag" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Posts" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: topHashtags.map((item, index) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: index + 1 }),
            /* @__PURE__ */ jsxs(TableCell, { className: "text-zinc-800", children: [
              "#",
              item.tag.replace(/^#+/, "")
            ] }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: numberFormatter.format(item.count) })
          ] }, item.tag)) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Publishing cadence" }) }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        recentDaily.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: "No published posts in this period." }) : /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Published" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: recentDaily.map((entry) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "text-zinc-800", children: format(new Date(entry.date), "MMM d, yyyy") }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: numberFormatter.format(entry.published) })
          ] }, entry.date)) })
        ] }),
        recentDaily.length > 0 ? /* @__PURE__ */ jsxs("p", { className: "text-xs text-zinc-500 mt-3", children: [
          "Showing the most recent ",
          recentDaily.length,
          " days within this window."
        ] }) : null
      ] })
    ] })
  ] });
}

export { AnalyticsPage as component };
//# sourceMappingURL=analytics-BdPVj6So.mjs.map
