import { jsxs, jsx } from 'react/jsx-runtime';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { B as Badge } from './badge-CMaTHFsF.mjs';
import { k as Route$5, f as useAuth, m as adminUsage, g as formatCurrency, B as Button, n as adminUpdateTrial } from './router-6_mKVCnu.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from './card-PfEJvKqD.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-BT6ar3tf.mjs';
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from './table-DqXpluqM.mjs';
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogFooter } from './dialog-BXfNY2DS.mjs';
import { I as Input, T as Textarea } from './textarea-BMvguWO3.mjs';
import { toast } from 'sonner';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import '@tanstack/react-router';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import 'lucide-react';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import 'axios';
import 'zod';
import 'next-themes';
import '@radix-ui/react-select';
import '@radix-ui/react-dialog';

const RANGE_OPTIONS = [{
  value: "7d",
  label: "Last 7 days"
}, {
  value: "30d",
  label: "Last 30 days"
}, {
  value: "all",
  label: "All time"
}];
function computeRangeParams(range) {
  if (range === "all") {
    return {};
  }
  const now = /* @__PURE__ */ new Date();
  const from = /* @__PURE__ */ new Date();
  if (range === "7d") {
    from.setDate(now.getDate() - 7);
  } else {
    from.setDate(now.getDate() - 30);
  }
  return {
    from: from.toISOString(),
    to: now.toISOString()
  };
}
function AdminDashboard() {
  var _a, _b;
  const loaderData = Route$5.useLoaderData();
  const [range, setRange] = useState("30d");
  const auth = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "usage", range],
    queryFn: async () => {
      const params = computeRangeParams(range);
      return adminUsage(params);
    },
    initialData: () => range === "30d" ? loaderData.initialUsage : void 0
  });
  const usage = (_b = (_a = query.data) == null ? void 0 : _a.usage) != null ? _b : [];
  const isLoading = query.isLoading || query.isFetching;
  const metrics = useMemo(() => {
    const totalSpend = usage.reduce((sum, item) => sum + item.totalCostUsd, 0);
    const totalActions = usage.reduce((sum, item) => sum + item.totalActions, 0);
    const activeSubscriptions = usage.filter((item) => item.subscriptionStatus === "active").length;
    const trialing = usage.filter((item) => {
      if (!item.trialEndsAt) return false;
      return item.trialEndsAt.getTime() > Date.now();
    }).length;
    return {
      totalSpend,
      totalActions,
      activeSubscriptions,
      trialing
    };
  }, [usage]);
  return /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Admin dashboard" }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-600", children: "Track AI usage costs, subscriptions, and trials." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(MetricCard, { label: "Total spend", value: formatCurrency(metrics.totalSpend), isLoading }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Total AI actions", value: metrics.totalActions.toLocaleString(), isLoading }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Active subscriptions", value: metrics.activeSubscriptions.toString(), isLoading }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Active trials", value: metrics.trialing.toString(), isLoading })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "User usage overview" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-500", children: "Select a range to inspect aggregate usage and manage trials." })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: range, onValueChange: (value) => setRange(value), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select range" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: RANGE_OPTIONS.map((option) => /* @__PURE__ */ jsx(SelectItem, { value: option.value, children: option.label }, option.value)) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "User" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Usage" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Last action" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Subscription" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Trial" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: usage.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-sm text-zinc-500 py-8", children: isLoading ? "Loading usage\u2026" : "No usage recorded for this period yet." }) }) : usage.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: row.name }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: row.email })
          ] }),
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: formatCurrency(row.totalCostUsd) }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-zinc-500", children: [
              row.totalActions.toLocaleString(),
              " actions"
            ] })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: row.lastActionAt ? /* @__PURE__ */ jsx("div", { className: "text-sm", children: formatDistanceToNow(row.lastActionAt, {
            addSuffix: true
          }) }) : /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-500", children: "No usage yet" }) }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(SubscriptionStatus, { summary: row }) }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(TrialSummary, { summary: row }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx(AdminTrialDialog, { summary: row, onUpdated: async () => {
            var _a2;
            await query.refetch();
            if (((_a2 = auth.user) == null ? void 0 : _a2.id) === row.userId) {
              await auth.refresh();
            }
            await qc.invalidateQueries({
              queryKey: ["admin", "usage"]
            });
          } }) })
        ] }, row.userId)) })
      ] }) }) })
    ] })
  ] });
}
function MetricCard({
  label,
  value,
  isLoading
}) {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm text-zinc-500 font-medium", children: label }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-zinc-900", children: isLoading ? /* @__PURE__ */ jsx("span", { className: "text-base text-zinc-400", children: "Loading\u2026" }) : value }) })
  ] });
}
function SubscriptionStatus({
  summary
}) {
  const status = summary.subscriptionStatus;
  const nextRenewal = summary.subscriptionCurrentPeriodEnd;
  const label = status.replace(/_/g, " ");
  const badgeVariant = status === "active" ? "default" : status === "past_due" ? "destructive" : "secondary";
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-sm", children: [
    /* @__PURE__ */ jsx(Badge, { variant: badgeVariant, children: label }),
    nextRenewal ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-zinc-500", children: [
      "Renews ",
      nextRenewal.toLocaleDateString()
    ] }) : null,
    summary.cancelAtPeriodEnd ? /* @__PURE__ */ jsx("div", { className: "text-xs text-amber-600", children: "Cancels at period end" }) : null,
    summary.stripeCustomerId ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-zinc-500", children: [
      "Customer ID ",
      summary.stripeCustomerId
    ] }) : /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: "Not yet subscribed" })
  ] });
}
function TrialSummary({
  summary
}) {
  if (!summary.trialEndsAt) {
    return /* @__PURE__ */ jsx("span", { className: "text-sm text-zinc-500", children: "No active trial" });
  }
  const now = Date.now();
  const remainingMs = summary.trialEndsAt.getTime() - now;
  const isActive = remainingMs > 0;
  return /* @__PURE__ */ jsxs("div", { className: "text-sm text-zinc-600 space-y-1", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      isActive ? "Ends " : "Ended ",
      formatDistanceToNow(summary.trialEndsAt, {
        addSuffix: true
      })
    ] }),
    summary.trialNotes ? /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500 whitespace-pre-wrap", children: summary.trialNotes }) : null
  ] });
}
function AdminTrialDialog({
  summary,
  onUpdated
}) {
  var _a;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState(() => formatDateTimeLocal(summary.trialEndsAt));
  const [notes, setNotes] = useState((_a = summary.trialNotes) != null ? _a : "");
  const reset = () => {
    setTrialEndsAt("");
    setNotes("");
  };
  const submit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
        trialNotes: notes.trim() ? notes.trim() : null
      };
      await adminUpdateTrial(summary.userId, {
        data: payload
      });
      toast.success("Trial updated");
      await onUpdated();
      setOpen(false);
    } catch (error) {
      const message = error && typeof error === "object" && "error" in error && typeof error.error === "string" ? error.error : "Failed to update trial";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: (next) => !submitting && setOpen(next), children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "Manage trial" }) }),
    /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
        "Update trial for ",
        summary.name
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-700", htmlFor: `trial-${summary.userId}`, children: "Trial end" }),
          /* @__PURE__ */ jsx(Input, { id: `trial-${summary.userId}`, type: "datetime-local", value: trialEndsAt, onChange: (event) => setTrialEndsAt(event.target.value) }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 text-xs text-zinc-500", children: [
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-8 px-2 text-xs", onClick: () => setTrialEndsAt(formatDateTimeLocal(addDays(7))), children: "+7 days" }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-8 px-2 text-xs", onClick: () => setTrialEndsAt(formatDateTimeLocal(addDays(14))), children: "+14 days" }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-8 px-2 text-xs", onClick: () => setTrialEndsAt(""), children: "Clear" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-700", htmlFor: `notes-${summary.userId}`, children: "Notes (optional)" }),
          /* @__PURE__ */ jsx(Textarea, { id: `notes-${summary.userId}`, rows: 4, value: notes, onChange: (event) => setNotes(event.target.value), placeholder: "Reason for trial, duration, or internal notes" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "flex flex-col sm:flex-row sm:justify-between gap-2", children: [
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", className: "sm:mr-auto", onClick: reset, disabled: submitting, children: "Reset" }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", type: "button", onClick: () => setOpen(false), disabled: submitting, children: "Cancel" }),
          /* @__PURE__ */ jsx(Button, { type: "button", onClick: submit, disabled: submitting, children: submitting ? "Saving\u2026" : "Save changes" })
        ] })
      ] })
    ] })
  ] });
}
function addDays(days) {
  const base = /* @__PURE__ */ new Date();
  base.setDate(base.getDate() + days);
  return base;
}
function formatDateTimeLocal(date) {
  if (!date) return "";
  const iso = new Date(date).toISOString();
  return iso.slice(0, 16);
}

export { AdminDashboard as component };
//# sourceMappingURL=admin-Cpnv97qo.mjs.map
