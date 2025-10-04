import { jsxs, jsx } from 'react/jsx-runtime';
import { useRouterState } from '@tanstack/react-router';
import { R as Route$b, f as useAuth, B as Button, g as formatCurrency, l as linkedInDisconnect, h as linkedInAuth0, s as settingsPutStyle, u as useSchedulingGetPreferences, a as useSchedulingGetSlots, b as useSchedulingUpdatePreferences, d as useSchedulingUpdateSlots, c as cn, e as customInstance } from './router-6_mKVCnu.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from './card-PfEJvKqD.mjs';
import { I as Input, T as Textarea } from './textarea-BMvguWO3.mjs';
import { L as Label } from './label-BlnZfui3.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-BT6ar3tf.mjs';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Command as Command$1 } from 'cmdk';
import { Info, SearchIcon } from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { u as useLinkedInStatus } from './useLinkedInStatus-BEufMIrs.mjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRef, useEffect, useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import 'axios';
import 'zod';
import 'next-themes';
import '@radix-ui/react-label';
import '@radix-ui/react-select';

function Popover({
  ...props
}) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Root, { "data-slot": "popover", ...props });
}
function PopoverTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Trigger, { "data-slot": "popover-trigger", ...props });
}
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  return /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
    PopoverPrimitive.Content,
    {
      "data-slot": "popover-content",
      align,
      sideOffset,
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
        className
      ),
      ...props
    }
  ) });
}
function Command({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Command$1,
    {
      "data-slot": "command",
      className: cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className
      ),
      ...props
    }
  );
}
function CommandInput({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-slot": "command-input-wrapper",
      className: "flex h-9 items-center gap-2 border-b px-3",
      children: [
        /* @__PURE__ */ jsx(SearchIcon, { className: "size-4 shrink-0 opacity-50" }),
        /* @__PURE__ */ jsx(
          Command$1.Input,
          {
            "data-slot": "command-input",
            className: cn(
              "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
              className
            ),
            ...props
          }
        )
      ]
    }
  );
}
function CommandList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Command$1.List,
    {
      "data-slot": "command-list",
      className: cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      ),
      ...props
    }
  );
}
function CommandEmpty({
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Command$1.Empty,
    {
      "data-slot": "command-empty",
      className: "py-6 text-center text-sm",
      ...props
    }
  );
}
function CommandGroup({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Command$1.Group,
    {
      "data-slot": "command-group",
      className: cn(
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className
      ),
      ...props
    }
  );
}
function CommandItem({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Command$1.Item,
    {
      "data-slot": "command-item",
      className: cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsx(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props }) });
}
function TooltipTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      sideOffset,
      className: cn(
        "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx(TooltipPrimitive.Arrow, { className: "bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })
      ]
    }
  ) });
}
function useSchedulingPreferences(initialData) {
  return useSchedulingGetPreferences({ query: { retry: false, initialData } });
}
function useSchedulingSlots(initialData) {
  return useSchedulingGetSlots({ query: { retry: false, initialData } });
}
function resolveSchedulingError(error, fallback) {
  if (error && typeof error === "object" && "error" in error) {
    const candidate = error.error;
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return fallback;
}
function useUpdateSchedulingPreferences() {
  const qc = useQueryClient();
  return useSchedulingUpdatePreferences({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["scheduling", "preferences"] });
        toast.success("Preferences saved");
      },
      onError: (error) => {
        toast.error(resolveSchedulingError(error, "Failed to save preferences"));
      }
    }
  });
}
function useReplaceTimeslots() {
  const qc = useQueryClient();
  return useSchedulingUpdateSlots({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["scheduling", "slots"] });
        toast.success("Timeslots updated");
      },
      onError: (error) => {
        toast.error(resolveSchedulingError(error, "Failed to update timeslots"));
      }
    }
  });
}
const billingCheckoutSession = (signal) => {
  return customInstance(
    {
      url: `/billing/checkout-session`,
      method: "POST",
      signal
    }
  );
};
const billingPortalSession = (signal) => {
  return customInstance(
    {
      url: `/billing/portal-session`,
      method: "POST",
      signal
    }
  );
};
const EMOJI_POLICY_OPTIONS = ["none", "few", "free"];
const POST_TYPE_OPTIONS = ["story", "how_to", "myth_bust", "listicle", "case_study", "announcement"];
function generateExampleId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
function createExampleEntry(text = "") {
  return {
    id: generateExampleId(),
    text
  };
}
function isEmojiPolicy(value) {
  return EMOJI_POLICY_OPTIONS.includes(value);
}
function isPostTypePreset(value) {
  return POST_TYPE_OPTIONS.includes(value);
}
function SettingsPage() {
  var _a, _b, _c, _d, _e;
  const loaderData = Route$b.useLoaderData();
  const routerState = useRouterState();
  const searchDetails = routerState.location.search;
  const searchObj = searchDetails && typeof searchDetails === "object" && !Array.isArray(searchDetails) ? searchDetails : void 0;
  const tabParam = (typeof (searchObj == null ? void 0 : searchObj.tab) === "string" ? searchObj.tab : void 0) || new URLSearchParams((_a = routerState.location.searchStr) != null ? _a : "").get("tab");
  const integrationsRef = useRef(null);
  const styleRef = useRef(null);
  const schedulingRef = useRef(null);
  const billingRef = useRef(null);
  useEffect(() => {
    const target = tabParam === "integrations" ? integrationsRef.current : tabParam === "style" ? styleRef.current : tabParam === "scheduling" ? schedulingRef.current : tabParam === "billing" ? billingRef.current : null;
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [tabParam]);
  const {
    data,
    isLoading
  } = useLinkedInStatus(loaderData.linkedIn);
  const qc = useQueryClient();
  const {
    user,
    refresh
  } = useAuth();
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [refreshingBilling, setRefreshingBilling] = useState(false);
  const resolveErrorMessage = (error, fallback) => {
    if (error && typeof error === "object" && "error" in error) {
      const candidate = error.error;
      if (typeof candidate === "string") {
        return candidate;
      }
    }
    return fallback;
  };
  const connect = async () => {
    try {
      const {
        url
      } = await linkedInAuth0();
      window.location.href = url;
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to start LinkedIn OAuth"));
    }
  };
  const disconnect = async () => {
    try {
      await linkedInDisconnect();
      await qc.invalidateQueries({
        queryKey: ["linkedin", "status"]
      });
      toast.success("Disconnected from LinkedIn");
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to disconnect LinkedIn"));
    }
  };
  const startCheckout = async () => {
    try {
      setStartingCheckout(true);
      const {
        url
      } = await billingCheckoutSession();
      window.location.href = url;
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Unable to start checkout"));
    } finally {
      setStartingCheckout(false);
    }
  };
  const openPortal = async () => {
    try {
      if (!(user == null ? void 0 : user.stripeCustomerId)) {
        toast.error("Billing portal is not available yet. Start a subscription first.");
        return;
      }
      setOpeningPortal(true);
      const {
        url
      } = await billingPortalSession();
      window.location.href = url;
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Unable to open billing portal"));
    } finally {
      setOpeningPortal(false);
    }
  };
  const refreshBilling = async () => {
    try {
      setRefreshingBilling(true);
      await refresh();
      toast.success("Billing status refreshed");
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to refresh billing status"));
    } finally {
      setRefreshingBilling(false);
    }
  };
  const connected = !!(data == null ? void 0 : data.connected);
  const subscriptionStatus = (_b = user == null ? void 0 : user.subscriptionStatus) != null ? _b : "inactive";
  const subscriptionLabel = subscriptionStatus.replace(/_/g, " ");
  const subscriptionActive = subscriptionStatus === "active";
  const hasStripeCustomer = !!(user == null ? void 0 : user.stripeCustomerId);
  const nextRenewal = (_c = user == null ? void 0 : user.subscriptionCurrentPeriodEnd) != null ? _c : null;
  const trialEndsAt = (_d = user == null ? void 0 : user.trialEndsAt) != null ? _d : null;
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > Date.now();
  const [style, setStyle] = useState((_e = loaderData.style) != null ? _e : null);
  const [examples, setExamples] = useState(() => {
    var _a2;
    return (((_a2 = loaderData.style) == null ? void 0 : _a2.examples) || []).map((example) => createExampleEntry(example));
  });
  const [savingStyle, setSavingStyle] = useState(false);
  const saveStyle = async () => {
    var _a2;
    try {
      setSavingStyle(true);
      const next = {
        tone: (style == null ? void 0 : style.tone) || void 0,
        audience: (style == null ? void 0 : style.audience) || void 0,
        goals: (style == null ? void 0 : style.goals) || void 0,
        emojiPolicy: (style == null ? void 0 : style.emojiPolicy) || void 0,
        constraints: (style == null ? void 0 : style.constraints) || void 0,
        hashtagPolicy: (style == null ? void 0 : style.hashtagPolicy) || void 0,
        glossary: (style == null ? void 0 : style.glossary) || void 0,
        examples: examples.map((entry) => entry.text.trim()).filter(Boolean).slice(0, 3),
        defaultPostType: style == null ? void 0 : style.defaultPostType
      };
      const payload = {
        // Backend expects a JSON-serializable structure; cast due to imperfect OpenAPI inference.
        style: next
      };
      const res = await settingsPutStyle(payload);
      const updatedStyle = (_a2 = res.style) != null ? _a2 : null;
      setStyle(updatedStyle);
      setExamples(((updatedStyle == null ? void 0 : updatedStyle.examples) || []).map((example) => createExampleEntry(example)));
      toast.success("Writing style saved");
    } catch (err) {
      toast.error("Failed to save style");
    } finally {
      setSavingStyle(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-10", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Settings" }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-600", children: "Profile, Integrations, and Defaults." })
    ] }),
    /* @__PURE__ */ jsxs("section", { ref: integrationsRef, children: [
      /* @__PURE__ */ jsx("h2", { id: "integrations", className: "text-lg font-medium mb-3 scroll-mt-24", children: "Integrations" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { children: "LinkedIn" }) }),
        /* @__PURE__ */ jsxs(CardContent, { className: "pt-0 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-700", children: isLoading ? "Checking status\u2026" : connected ? "Connected" : "Not connected" }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: connected ? /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: disconnect, children: "Disconnect" }) : /* @__PURE__ */ jsx(Button, { size: "sm", onClick: connect, children: "Connect LinkedIn" }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("section", { ref: styleRef, children: [
      /* @__PURE__ */ jsx("h2", { id: "writing-style", className: "text-lg font-medium mb-3 scroll-mt-24", children: "Writing Style" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsx(CardTitle, { children: "Style Profile" }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Set your default voice, audience, and constraints." })
          ] }),
          /* @__PURE__ */ jsxs(CardContent, { className: "pt-0 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "style-tone", children: "Tone" }),
                /* @__PURE__ */ jsx(Input, { id: "style-tone", value: (style == null ? void 0 : style.tone) || "", onChange: (e) => setStyle({
                  ...style || {},
                  tone: e.target.value
                }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "style-audience", children: "Audience" }),
                /* @__PURE__ */ jsx(Input, { id: "style-audience", value: (style == null ? void 0 : style.audience) || "", onChange: (e) => setStyle({
                  ...style || {},
                  audience: e.target.value
                }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "style-goals", children: "Goals" }),
                /* @__PURE__ */ jsx(Input, { id: "style-goals", value: (style == null ? void 0 : style.goals) || "", onChange: (e) => setStyle({
                  ...style || {},
                  goals: e.target.value
                }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "style-emoji", children: "Emoji policy" }),
                /* @__PURE__ */ jsxs(Select, { value: (style == null ? void 0 : style.emojiPolicy) || "few", onValueChange: (nextPolicy) => {
                  if (!isEmojiPolicy(nextPolicy)) {
                    return;
                  }
                  setStyle({
                    ...style || {},
                    emojiPolicy: nextPolicy
                  });
                }, children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { id: "style-emoji", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select" }) }),
                  /* @__PURE__ */ jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "None" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "few", children: "Few" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "free", children: "Free" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "style-posttype", children: "Default post type" }),
                /* @__PURE__ */ jsxs(Select, { value: (style == null ? void 0 : style.defaultPostType) || "story", onValueChange: (nextType) => {
                  if (!isPostTypePreset(nextType)) {
                    return;
                  }
                  setStyle({
                    ...style || {},
                    defaultPostType: nextType
                  });
                }, children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { id: "style-posttype", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select" }) }),
                  /* @__PURE__ */ jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsx(SelectItem, { value: "story", children: "Story" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "how_to", children: "How-to" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "myth_bust", children: "Myth-bust" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "listicle", children: "Listicle" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "case_study", children: "Case study" }),
                    /* @__PURE__ */ jsx(SelectItem, { value: "announcement", children: "Announcement" })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end", children: /* @__PURE__ */ jsx(Button, { onClick: saveStyle, disabled: savingStyle, children: savingStyle ? "Saving\u2026" : "Save Writing Style" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsx(CardTitle, { children: "Few-shot Examples" }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm text-zinc-600", children: "Add up to 3 of your own posts to guide tone and structure." })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { className: "pt-0 space-y-4", children: examples.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-dashed bg-zinc-50 p-6 text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "No examples added yet." }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-zinc-500", children: "Paste a representative post (2\u20135 short paragraphs; hashtags at the end)." }),
            /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", onClick: () => setExamples([createExampleEntry()]), children: "Add your first example" }) })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            examples.map((example, idx) => /* @__PURE__ */ jsxs("div", { className: "rounded-md border bg-white p-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsxs(Label, { htmlFor: `ex-${example.id}`, children: [
                  "Example ",
                  idx + 1
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-xs text-zinc-500", children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    example.text.length,
                    "/1200"
                  ] }),
                  /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setExamples((cur) => cur.filter((entry) => entry.id !== example.id)), children: "Remove" })
                ] })
              ] }),
              /* @__PURE__ */ jsx(Textarea, { id: `ex-${example.id}`, className: "mt-2 h-40", value: example.text, onChange: (e) => {
                const val = e.target.value.slice(0, 1200);
                setExamples((cur) => cur.map((entry) => entry.id === example.id ? {
                  ...entry,
                  text: val
                } : entry));
              }, placeholder: "Paste a representative LinkedIn post\u2026" })
            ] }, example.id)),
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end", children: /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: examples.length >= 3, onClick: () => setExamples((cur) => cur.length < 3 ? [...cur, createExampleEntry()] : cur), children: "Add another example" }) })
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { ref: schedulingRef, children: [
      /* @__PURE__ */ jsx("h2", { id: "scheduling", className: "text-lg font-medium mb-3 scroll-mt-24", children: "Scheduling" }),
      /* @__PURE__ */ jsx(SchedulingSettings, { initialPrefs: loaderData.preferences, initialSlots: loaderData.slots })
    ] }),
    /* @__PURE__ */ jsxs("section", { ref: billingRef, children: [
      /* @__PURE__ */ jsx("h2", { id: "billing", className: "text-lg font-medium mb-3 scroll-mt-24", children: "Billing" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Subscription" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm text-zinc-600", children: [
            "Content Creation Pro \xB7 ",
            formatCurrency(50),
            " per month"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-sm text-zinc-600", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium text-zinc-800", children: "Status:" }),
              " ",
              subscriptionLabel
            ] }),
            subscriptionActive && nextRenewal ? /* @__PURE__ */ jsxs("div", { children: [
              "Next renewal ",
              nextRenewal.toLocaleDateString()
            ] }) : null,
            trialEndsAt ? /* @__PURE__ */ jsxs("div", { className: trialActive ? "text-amber-600" : "text-zinc-500", children: [
              "Trial ",
              trialActive ? "ends" : "ended",
              " ",
              formatDistanceToNow(trialEndsAt, {
                addSuffix: true
              })
            ] }) : /* @__PURE__ */ jsx("div", { className: "text-zinc-500", children: "No trial configured" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            !subscriptionActive && /* @__PURE__ */ jsx(Button, { onClick: startCheckout, disabled: startingCheckout, children: startingCheckout ? "Redirecting\u2026" : `Subscribe for ${formatCurrency(50)}/month` }),
            hasStripeCustomer && /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: openPortal, disabled: openingPortal, children: openingPortal ? "Opening\u2026" : "Manage billing" }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: refreshBilling, disabled: refreshingBilling, children: refreshingBilling ? "Refreshing\u2026" : "Refresh status" })
          ] }),
          !hasStripeCustomer && !subscriptionActive ? /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Secure checkout via Stripe. Subscriptions are $50/month with no automatic free trial." }) : null
        ] })
      ] }) })
    ] })
  ] });
}
function SchedulingSettings({
  initialPrefs,
  initialSlots
}) {
  var _a, _b, _c, _d;
  const prefsQuery = useSchedulingPreferences(initialPrefs);
  const slotsQuery = useSchedulingSlots(initialSlots);
  const updatePrefs = useUpdateSchedulingPreferences();
  const replaceSlots = useReplaceTimeslots();
  const tzOptions = useMemo(() => {
    const zones = [
      "Etc/GMT+12",
      // UTC-12:00
      "Pacific/Pago_Pago",
      "Pacific/Honolulu",
      "Pacific/Marquesas",
      // -09:30
      "America/Anchorage",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Santo_Domingo",
      "America/St_Johns",
      "America/Argentina/Buenos_Aires",
      "America/Noronha",
      "Atlantic/Cape_Verde",
      "Europe/London",
      "Europe/Berlin",
      "Africa/Cairo",
      "Africa/Nairobi",
      "Asia/Tehran",
      "Asia/Dubai",
      "Asia/Kabul",
      "Asia/Karachi",
      "Asia/Kolkata",
      "Asia/Kathmandu",
      "Asia/Dhaka",
      "Asia/Yangon",
      "Asia/Bangkok",
      "Asia/Singapore",
      "Australia/Eucla",
      "Asia/Tokyo",
      "Australia/Darwin",
      "Australia/Sydney",
      "Australia/Lord_Howe",
      "Pacific/Noumea",
      "Pacific/Auckland",
      "Pacific/Chatham",
      "Pacific/Tongatapu",
      "Pacific/Kiritimati"
    ];
    const toOffset = (tz2) => {
      var _a2;
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz2,
          timeZoneName: "shortOffset",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }).formatToParts(/* @__PURE__ */ new Date());
        const name = ((_a2 = parts.find((p) => p.type === "timeZoneName")) == null ? void 0 : _a2.value) || "";
        const m = name.match(/(?:GMT|UTC)([+\-])(\d{1,2})(?::?(\d{2}))?/i);
        if (!m) {
          return {
            minutes: 0,
            label: "UTC\xB100:00"
          };
        }
        const sign = m[1] === "-" ? -1 : 1;
        const hh = Number(m[2] || "0");
        const mm = Number(m[3] || "0");
        const minutes = sign * (hh * 60 + mm);
        const hhStr = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0");
        const mmStr = String(Math.abs(minutes) % 60).padStart(2, "0");
        return {
          minutes,
          label: `UTC${sign < 0 ? "-" : "+"}${hhStr}:${mmStr}`
        };
      } catch {
        return {
          minutes: 0,
          label: "UTC\xB100:00"
        };
      }
    };
    const mapped = zones.map((z) => {
      const off = toOffset(z);
      return {
        value: z,
        label: `(${off.label}) ${z}`,
        minutes: off.minutes
      };
    });
    mapped.sort((a, b) => a.minutes - b.minutes || a.value.localeCompare(b.value));
    return mapped;
  }, []);
  const [tz, setTz] = useState(((_a = prefsQuery.data) == null ? void 0 : _a.preferences.timezone) || "Europe/London");
  const [lead, setLead] = useState(((_c = (_b = prefsQuery.data) == null ? void 0 : _b.preferences.leadTimeMinutes) == null ? void 0 : _c.toString()) || "30");
  useEffect(() => {
    var _a2, _b2;
    if ((_a2 = prefsQuery.data) == null ? void 0 : _a2.preferences) {
      setTz(prefsQuery.data.preferences.timezone);
      setLead(String((_b2 = prefsQuery.data.preferences.leadTimeMinutes) != null ? _b2 : 30));
    }
  }, [prefsQuery.data]);
  const [newDay, setNewDay] = useState("1");
  const [newTime, setNewTime] = useState("09:00");
  const slots = ((_d = slotsQuery.data) == null ? void 0 : _d.items) || [];
  const addSlot = () => {
    if (!newTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
      toast.error("Invalid time; use HH:mm");
      return;
    }
    const isoDayOfWeek = Number(newDay);
    const exists = slots.some((s) => s.isoDayOfWeek === isoDayOfWeek && s.time === newTime);
    if (exists) {
      toast.error("Duplicate slot");
      return;
    }
    const updated = [...slots, {
      isoDayOfWeek,
      time: newTime,
      active: true
    }];
    replaceSlots.mutate({
      items: updated
    });
  };
  const removeSlot = (idx) => {
    const updated = slots.filter((_, i) => i !== idx);
    if (updated.length === 0) {
      toast.error("At least one timeslot is required");
      return;
    }
    replaceSlots.mutate({
      items: updated
    });
  };
  const savePrefs = () => {
    const leadNum = Number(lead);
    if (!Number.isInteger(leadNum) || leadNum < 0 || leadNum > 1440) {
      toast.error("Lead time must be between 0 and 1440");
      return;
    }
    updatePrefs.mutate({
      timezone: tz,
      leadTimeMinutes: leadNum
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Preferences" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Timezone and lead-time defaults for scheduling." })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { className: "pt-0 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-field md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "tz", children: "Timezone" }),
            /* @__PURE__ */ jsx(TimezoneCombobox, { id: "tz", value: tz, onChange: setTz, options: tzOptions })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "lead", children: "Lead time (minutes)" }),
              /* @__PURE__ */ jsxs(Tooltip, { children: [
                /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Info, { className: "h-4 w-4 text-zinc-500", "aria-label": "Lead time info" }) }),
                /* @__PURE__ */ jsx(TooltipContent, { children: "Buffer before earliest eligible timeslot" })
              ] })
            ] }),
            /* @__PURE__ */ jsx(Input, { id: "lead", type: "number", min: 0, max: 1440, value: lead, onChange: (e) => setLead(e.target.value), className: "w-28 sm:w-36 md:w-40" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { size: "sm", onClick: savePrefs, disabled: updatePrefs.isPending, children: updatePrefs.isPending ? "Saving\u2026" : "Save Preferences" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Preferred Timeslots" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Add default days/times for auto-scheduling." })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { className: "pt-0 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs(Select, { value: newDay, onValueChange: setNewDay, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Day" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "1", children: "Monday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "2", children: "Tuesday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "3", children: "Wednesday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "4", children: "Thursday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "5", children: "Friday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "6", children: "Saturday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "7", children: "Sunday" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Input, { type: "time", value: newTime, onChange: (e) => setNewTime(e.target.value), className: "w-36" }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", onClick: addSlot, disabled: replaceSlots.isPending, children: "Add Slot" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-1", children: slotsQuery.isLoading ? /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Loading slots\u2026" }) : slots.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "No slots configured." }) : slots.map((s, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium mr-2", children: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.isoDayOfWeek] }),
            /* @__PURE__ */ jsx("span", { className: "text-zinc-700", children: s.time })
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => removeSlot(idx), disabled: replaceSlots.isPending, children: "Remove" })
        ] }, `${s.isoDayOfWeek}-${s.time}`)) })
      ] })
    ] })
  ] });
}
function TimezoneCombobox({
  id,
  value,
  onChange,
  options
}) {
  var _a;
  const [open, setOpen] = useState(false);
  const display = ((_a = options.find((o) => o.value === value)) == null ? void 0 : _a.label) || value || "Select timezone";
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { id, variant: "outline", "aria-expanded": open, "aria-haspopup": "listbox", className: "w-full justify-between", children: [
      /* @__PURE__ */ jsx("span", { className: "truncate max-w-[85%] text-left", children: display }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-zinc-500", children: "\u25BC" })
    ] }) }),
    /* @__PURE__ */ jsx(PopoverContent, { className: "min-w-[420px] w-fit max-w-[640px] p-0", children: /* @__PURE__ */ jsxs(Command, { children: [
      /* @__PURE__ */ jsx(CommandInput, { placeholder: "Search timezone\u2026" }),
      /* @__PURE__ */ jsx(CommandEmpty, { children: "No timezone found." }),
      /* @__PURE__ */ jsx(CommandList, { children: /* @__PURE__ */ jsx(CommandGroup, { children: options.map((o) => /* @__PURE__ */ jsx(CommandItem, { value: o.value, onSelect: (val) => {
        onChange(val);
        setOpen(false);
      }, children: /* @__PURE__ */ jsx("span", { className: "whitespace-normal break-words", children: o.label }) }, o.value)) }) })
    ] }) })
  ] });
}

export { SettingsPage as component };
//# sourceMappingURL=settings-Czopdaqu.mjs.map
