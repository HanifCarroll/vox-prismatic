import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useParams, useNavigate, useRouterState } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useRef, useEffect, useId, useMemo } from 'react';
import { H as Route$1, I as projectsProcess, J as projectsUpdate, B as Button, K as projectsUpdateStage, q as postsListByProject, r as useTranscriptsGet, t as usePostsUpdate, v as usePostsBulkSetStatus, w as usePostsPublishNow, x as usePostsSchedule, y as usePostsUnschedule, z as usePostsAutoSchedule, A as usePostsAutoScheduleProject, D as useTranscriptsPut, c as cn, C as usePostsBulkRegenerate, h as linkedInAuth0, G as postsHookWorkbench, E as buttonVariants, F as usePostsFrameworks } from './router-6_mKVCnu.mjs';
import { u as useLinkedInStatus } from './useLinkedInStatus-BEufMIrs.mjs';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent, d as CardDescription, e as CardFooter } from './card-PfEJvKqD.mjs';
import { T as Textarea, I as Input } from './textarea-BMvguWO3.mjs';
import { P as ProjectDeleteButton, a as Progress } from './ProjectDeleteButton-DL2XeVqE.mjs';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva } from 'class-variance-authority';
import { L as Label } from './label-BlnZfui3.mjs';
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, f as DialogDescription, e as DialogFooter } from './dialog-BXfNY2DS.mjs';
import { Loader2, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { getDefaultClassNames, DayPicker } from 'react-day-picker';
import { format, startOfToday, formatDistanceToNow } from 'date-fns';
import { Drawer as Drawer$1 } from 'vaul';
import { B as Badge } from './badge-CMaTHFsF.mjs';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-BT6ar3tf.mjs';
import '@tanstack/react-router-devtools';
import '@tanstack/react-query-devtools';
import '@radix-ui/react-slot';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-separator';
import 'axios';
import 'next-themes';
import '@radix-ui/react-progress';
import '@radix-ui/react-alert-dialog';
import '@radix-ui/react-label';
import '@radix-ui/react-select';

var _a, _b;
function useProjectPosts(projectId, enabled, initialData) {
  return useQuery({
    queryKey: ["posts", { projectId, page: 1, pageSize: 100 }],
    queryFn: ({ signal }) => postsListByProject(projectId, { page: 1, pageSize: 100 }, signal),
    enabled: !!projectId && enabled,
    initialData
  });
}
function useTranscript(projectId, initialData) {
  return useTranscriptsGet(projectId, {
    query: {
      enabled: !!projectId,
      initialData
    }
  });
}
function useUpdatePost(projectId) {
  const qc = useQueryClient();
  const updateMutation = usePostsUpdate();
  return {
    ...updateMutation,
    mutate: ({
      postId,
      data
    }) => {
      updateMutation.mutate(
        { id: postId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            toast.success("Post updated");
          }
        }
      );
    }
  };
}
function useBulkSetStatus(projectId) {
  const qc = useQueryClient();
  const bulkMutation = usePostsBulkSetStatus();
  return {
    ...bulkMutation,
    mutate: ({ ids, status }) => {
      bulkMutation.mutate(
        { data: { ids, status } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            toast.success("Bulk update applied");
          }
        }
      );
    }
  };
}
function usePublishNow(projectId) {
  const qc = useQueryClient();
  const publishMutation = usePostsPublishNow();
  return {
    ...publishMutation,
    mutate: (postId) => {
      publishMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            if (projectId) {
              qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            }
            toast.success("Post published on LinkedIn");
          },
          onError: (error) => {
            toast.error(error.error || "Failed to publish post");
          }
        }
      );
    }
  };
}
function useBulkRegeneratePosts(projectId) {
  const qc = useQueryClient();
  const regenerateMutation = usePostsBulkRegenerate({
    mutation: {
      onMutate: async ({ data }) => {
        const { ids } = data;
        await qc.cancelQueries({ queryKey: ["posts", { projectId, page: 1, pageSize: 100 }] });
        const prev = qc.getQueryData(["posts", { projectId, page: 1, pageSize: 100 }]);
        qc.setQueryData(["posts", { projectId, page: 1, pageSize: 100 }], (cur) => {
          if (!cur) {
            return cur;
          }
          return {
            ...cur,
            items: (cur.items || []).map(
              (post) => ids.includes(post.id) ? { ...post, status: "pending" } : post
            )
          };
        });
        return { prev };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx == null ? void 0 : ctx.prev) {
          qc.setQueryData(["posts", { projectId, page: 1, pageSize: 100 }], ctx.prev);
        }
        toast.error("Failed to regenerate posts");
      },
      onSuccess: (response) => {
        qc.setQueryData(["posts", { projectId, page: 1, pageSize: 100 }], (previous) => {
          if (!previous || !(response == null ? void 0 : response.items)) {
            return previous;
          }
          const existingItems = previous.items || [];
          const regeneratedById = new Map(response.items.map((post) => [post.id, post]));
          const mergedItems = existingItems.map((existingPost) => {
            const updated = regeneratedById.get(existingPost.id);
            return updated ? { ...existingPost, ...updated } : existingPost;
          });
          return { ...previous, items: mergedItems };
        });
        qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
        toast.success("Regeneration queued");
      }
    }
  });
  return regenerateMutation;
}
function useSchedulePost(projectId) {
  const qc = useQueryClient();
  const scheduleMutation = usePostsSchedule();
  return {
    ...scheduleMutation,
    mutate: ({ postId, scheduledAt }) => {
      const iso = scheduledAt instanceof Date ? scheduledAt.toISOString() : new Date(scheduledAt).toISOString();
      scheduleMutation.mutate(
        { id: postId, data: { scheduledAt: iso } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            toast.success("Post scheduled");
          },
          onError: (error) => {
            toast.error(error.error || "Failed to schedule post");
          }
        }
      );
    }
  };
}
function useUnschedulePost(projectId) {
  const qc = useQueryClient();
  const unscheduleMutation = usePostsUnschedule();
  return {
    ...unscheduleMutation,
    mutate: ({ postId }) => {
      unscheduleMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            toast.success("Post unscheduled");
          },
          onError: (error) => {
            toast.error(error.error || "Failed to unschedule post");
          }
        }
      );
    }
  };
}
function useAutoschedulePost(projectId) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const autoScheduleMutation = usePostsAutoSchedule();
  return {
    ...autoScheduleMutation,
    mutate: (postId) => {
      autoScheduleMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            toast.success("Post auto-scheduled");
          },
          onError: (error) => {
            const msg = error.error || "Failed to auto-schedule post";
            const openScheduling = () => navigate({ to: "/settings", search: { tab: "scheduling" } });
            const openIntegrations = () => navigate({ to: "/settings", search: { tab: "integrations" } });
            if (/No preferred timeslots configured/i.test(msg)) {
              toast.error(msg, { action: { label: "Open Scheduling", onClick: openScheduling } });
              return;
            }
            if (/No available timeslot/i.test(msg)) {
              toast.error(msg, { action: { label: "Open Scheduling", onClick: openScheduling } });
              return;
            }
            if (/LinkedIn is not connected/i.test(msg)) {
              toast.error(msg, { action: { label: "Connect LinkedIn", onClick: openIntegrations } });
              return;
            }
            if (/must be approved/i.test(msg)) {
              toast.error("Approve the post before scheduling");
              return;
            }
            if (/already scheduled/i.test(msg)) {
              toast.error("Post is already scheduled. Unschedule it first.");
              return;
            }
            toast.error(msg);
          }
        }
      );
    }
  };
}
function useAutoscheduleProject(projectId) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const autoscheduleProjectMutation = usePostsAutoScheduleProject();
  return {
    ...autoscheduleProjectMutation,
    mutate: (vars = {}) => {
      autoscheduleProjectMutation.mutate(
        { projectId, data: { ...typeof vars.limit === "number" ? { limit: vars.limit } : {} } },
        {
          onSuccess: (res) => {
            var _a2, _b2, _c, _d, _e;
            qc.invalidateQueries({ queryKey: ["posts", { projectId }] });
            const scheduledCount = Number((_b2 = (_a2 = res.meta) == null ? void 0 : _a2.scheduledCount) != null ? _b2 : 0);
            const requested = Number((_e = (_d = (_c = res.meta) == null ? void 0 : _c.requested) != null ? _d : vars.limit) != null ? _e : scheduledCount);
            toast.success(`Auto-scheduled ${scheduledCount}/${requested} posts`);
          },
          onError: (error) => {
            const msg = error.error || "Failed to auto-schedule project posts";
            const openScheduling = () => navigate({ to: "/settings", search: { tab: "scheduling" } });
            const openIntegrations = () => navigate({ to: "/settings", search: { tab: "integrations" } });
            if (/No preferred timeslots configured/i.test(msg)) {
              toast.error(msg, { action: { label: "Open Scheduling", onClick: openScheduling } });
              return;
            }
            if (/No available timeslot/i.test(msg)) {
              toast.error(msg, { action: { label: "Open Scheduling", onClick: openScheduling } });
              return;
            }
            if (/LinkedIn is not connected/i.test(msg)) {
              toast.error(msg, { action: { label: "Connect LinkedIn", onClick: openIntegrations } });
              return;
            }
            toast.error(msg);
          }
        }
      );
    }
  };
}
function useUpdateTranscript(projectId) {
  const qc = useQueryClient();
  const updateMutation = useTranscriptsPut();
  return {
    ...updateMutation,
    mutate: (transcript) => {
      updateMutation.mutate(
        { id: projectId, data: { transcript } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["transcript", projectId] });
            toast.success("Transcript updated");
          }
        }
      );
    }
  };
}
(
  // eslint-disable-next-line no-process-env, @typescript-eslint/no-explicit-any
  (_b = (_a = process == null ? void 0 : process.env) == null ? void 0 : _a.VITE_API_URL) != null ? _b : "http://api:3000"
) ;
let echoInstance = null;
const createEcho = () => {
  {
    throw new Error("Realtime connections are only available in the browser");
  }
};
const getEcho = () => {
  if (!echoInstance) {
    echoInstance = createEcho();
  }
  return echoInstance;
};
const PostSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  insightId: z.string(),
  content: z.string(),
  hashtags: z.union([z.string(), z.array(z.string())]),
  platform: z.string(),
  status: z.string(),
  publishedAt: z.string(),
  scheduledAt: z.string(),
  scheduleStatus: z.string(),
  scheduleError: z.string(),
  scheduleAttemptedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const POSTS_QUERY_KEY = (projectId) => ["posts", { projectId, page: 1, pageSize: 100 }];
function useRealtimePosts(projectId, userId, options = {}) {
  const { enabled = true } = options;
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled || !projectId || !userId) {
      return void 0;
    }
    let active = true;
    try {
      const echo = getEcho();
      const channel = echo.private(`user.${userId}`);
      const handlePostRegenerated = (payload) => {
        if (!active) {
          return;
        }
        try {
          const parsed = PostSchema.parse(payload.post);
          if (!parsed || parsed.projectId !== projectId) {
            return;
          }
          client.setQueryData(POSTS_QUERY_KEY(projectId), (current) => {
            var _a2;
            if (!current) {
              return current;
            }
            const exists = ((_a2 = current.items) != null ? _a2 : []).some((item) => item.id === parsed.id);
            if (!exists) {
              return current;
            }
            const mergedItems = current.items.map((item) => {
              if (item.id !== parsed.id) {
                return item;
              }
              const merged = {
                ...item,
                ...parsed
              };
              return merged;
            });
            return {
              ...current,
              items: mergedItems
            };
          });
        } catch (error) {
          console.error("Failed to handle post.regenerated event", error);
        }
      };
      channel.listen(".post.regenerated", handlePostRegenerated);
      return () => {
        active = false;
        channel.stopListening(".post.regenerated");
        echo.leave(`user.${userId}`);
      };
    } catch (error) {
      console.error("Realtime posts subscription failed", error);
      return void 0;
    }
  }, [client, enabled, projectId, userId]);
}
function useProjectProcessingRealtime(projectId, options = {}) {
  const { enabled = true } = options;
  const handlersRef = useRef({});
  useEffect(() => {
    handlersRef.current = options;
  }, [options]);
  useEffect(() => {
    if (!enabled || !projectId) {
      return void 0;
    }
    try {
      const echo = getEcho();
      const channel = echo.private(`project.${projectId}`);
      const handleProgress = (payload) => {
        var _a2, _b2;
        if (payload.projectId && payload.projectId !== projectId) {
          return;
        }
        (_b2 = (_a2 = handlersRef.current).onProgress) == null ? void 0 : _b2.call(_a2, {
          projectId,
          progress: typeof payload.progress === "number" ? payload.progress : 0,
          step: typeof payload.step === "string" ? payload.step : ""
        });
      };
      const handleCompleted = (payload) => {
        var _a2, _b2;
        if (payload.projectId && payload.projectId !== projectId) {
          return;
        }
        (_b2 = (_a2 = handlersRef.current).onCompleted) == null ? void 0 : _b2.call(_a2, { projectId });
      };
      const handleFailed = (payload) => {
        var _a2, _b2;
        if (payload.projectId && payload.projectId !== projectId) {
          return;
        }
        (_b2 = (_a2 = handlersRef.current).onFailed) == null ? void 0 : _b2.call(_a2, {
          projectId,
          message: typeof payload.message === "string" ? payload.message : void 0
        });
      };
      channel.listen(".project.progress", handleProgress);
      channel.listen(".project.completed", handleCompleted);
      channel.listen(".project.failed", handleFailed);
      return () => {
        channel.stopListening(".project.progress");
        channel.stopListening(".project.completed");
        channel.stopListening(".project.failed");
        echo.leave(`project.${projectId}`);
      };
    } catch (error) {
      console.error("Failed to subscribe to project channel", error);
      return void 0;
    }
  }, [enabled, projectId]);
}
function Tabs({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Root,
    {
      "data-slot": "tabs",
      className: cn("flex flex-col gap-2", className),
      ...props
    }
  );
}
function TabsList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.List,
    {
      "data-slot": "tabs-list",
      className: cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      ),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Content,
    {
      "data-slot": "tabs-content",
      className: cn("flex-1 outline-none", className),
      ...props
    }
  );
}
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "skeleton",
      className: cn("bg-accent animate-pulse rounded-md", className),
      ...props
    }
  );
}
function PostQueue({
  posts,
  selectedPostId,
  selectedSet,
  onSelect,
  onToggleSelect
}) {
  return /* @__PURE__ */ jsx("div", { className: "divide-y", children: posts.map((post) => {
    const active = post.id === selectedPostId;
    return /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: `flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-zinc-50 ${active ? "bg-zinc-50 border-l-2 border-zinc-300" : ""}`,
        onClick: () => onSelect(post.id),
        children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              className: "mt-1 h-4 w-4 rounded border-zinc-300",
              checked: selectedSet.has(post.id),
              onChange: (e) => {
                e.stopPropagation();
                onToggleSelect(post.id);
              }
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs rounded px-1.5 py-0.5 border text-zinc-700 bg-zinc-50", children: post.status }),
              post.scheduleStatus ? /* @__PURE__ */ jsx("span", { className: "text-[10px] rounded px-1 py-0.5 border text-sky-700 bg-sky-50", children: post.scheduleStatus }) : null
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 line-clamp-2 text-sm text-zinc-800", children: (post.content || "").slice(0, 160) || "\u2014" })
          ] })
        ]
      },
      post.id
    );
  }) });
}
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const ToggleGroupContext = React.createContext({
  size: "default",
  variant: "default"
});
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    ToggleGroupPrimitive.Root,
    {
      "data-slot": "toggle-group",
      "data-variant": variant,
      "data-size": size,
      className: cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(ToggleGroupContext.Provider, { value: { variant, size }, children })
    }
  );
}
function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}) {
  const context = React.useContext(ToggleGroupContext);
  return /* @__PURE__ */ jsx(
    ToggleGroupPrimitive.Item,
    {
      "data-slot": "toggle-group-item",
      "data-variant": context.variant || variant,
      "data-size": context.size || size,
      className: cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className
      ),
      ...props,
      children
    }
  );
}
function HashtagEditor({
  value,
  onChange
}) {
  const [draft, setDraft] = useState("");
  const commitDraft = () => {
    const raw = draft.trim();
    if (!raw) {
      return;
    }
    const tokens = raw.split(/\s+/).map((t) => t.trim()).filter(Boolean).map((t) => t.startsWith("#") ? t : `#${t}`).map((t) => t.replace(/\s+/g, ""));
    const next = Array.from(/* @__PURE__ */ new Set([...value, ...tokens]));
    onChange(next);
    setDraft("");
  };
  const removeAt = (idx) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };
  const onKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter" || e.key === "Tab") {
      if (draft.trim().length > 0) {
        e.preventDefault();
        commitDraft();
      }
    } else if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "mt-5 form-field", children: [
    /* @__PURE__ */ jsx(Label, { className: "block", children: "Hashtags" }),
    /* @__PURE__ */ jsxs("div", { className: "flex min-h-10 flex-wrap items-center gap-2 rounded-md border px-2 py-1.5", children: [
      value.map((tag, idx) => /* @__PURE__ */ jsxs(
        "span",
        {
          className: "inline-flex items-center gap-1 rounded-full border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-800",
          children: [
            tag,
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                "aria-label": `Remove ${tag}`,
                className: "text-zinc-500 hover:text-zinc-800",
                onClick: () => removeAt(idx),
                children: "\xD7"
              }
            )
          ]
        },
        tag
      )),
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "flex-1 min-w-[8rem] bg-transparent outline-none text-sm",
          value: draft,
          onChange: (e) => setDraft(e.target.value),
          onKeyDown,
          onBlur: commitDraft,
          placeholder: value.length === 0 ? "#ai #startups #product" : ""
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-[11px] text-zinc-500", children: "Aim for 3\u20135 relevant hashtags." })
  ] });
}
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  return /* @__PURE__ */ jsx(
    DayPicker,
    {
      showOutsideDays,
      className: cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      ),
      captionLayout,
      formatters: {
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters
      },
      classNames: {
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label" ? "text-sm" : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames
      },
      components: {
        Root: ({ className: className2, rootRef, ...props2 }) => {
          return /* @__PURE__ */ jsx(
            "div",
            {
              "data-slot": "calendar",
              ref: rootRef,
              className: cn(className2),
              ...props2
            }
          );
        },
        Chevron: ({ className: className2, orientation, ...props2 }) => {
          if (orientation === "left") {
            return /* @__PURE__ */ jsx(ChevronLeftIcon, { className: cn("size-4", className2), ...props2 });
          }
          if (orientation === "right") {
            return /* @__PURE__ */ jsx(
              ChevronRightIcon,
              {
                className: cn("size-4", className2),
                ...props2
              }
            );
          }
          return /* @__PURE__ */ jsx(ChevronDownIcon, { className: cn("size-4", className2), ...props2 });
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props2 }) => {
          return /* @__PURE__ */ jsx("td", { ...props2, children: /* @__PURE__ */ jsx("div", { className: "flex size-(--cell-size) items-center justify-center text-center", children }) });
        },
        ...components
      },
      ...props
    }
  );
}
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef(null);
  React.useEffect(() => {
    var _a2;
    if (modifiers.focused) {
      (_a2 = ref.current) == null ? void 0 : _a2.focus();
    }
  }, [modifiers.focused]);
  return /* @__PURE__ */ jsx(
    Button,
    {
      ref,
      variant: "ghost",
      size: "icon",
      "data-day": day.date.toLocaleDateString(),
      "data-selected-single": modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle,
      "data-range-start": modifiers.range_start,
      "data-range-end": modifiers.range_end,
      "data-range-middle": modifiers.range_middle,
      className: cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      ),
      ...props
    }
  );
}
const getApiErrorMessage = (error, fallback) => {
  if (error && typeof error === "object" && "error" in error) {
    const candidate = error.error;
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return fallback;
};
const isModerationStatus = (value) => value === "pending" || value === "approved" || value === "rejected";
const isPromiseLike = (value) => Boolean(
  value && typeof value === "object" && "then" in value && typeof value.then === "function"
);
const getNextHourSlot = () => {
  const now = /* @__PURE__ */ new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour;
};
const PARAGRAPH_SPLIT = /\n{2,}/;
const deriveHookFromContent = (content) => {
  if (!content) {
    return "";
  }
  const first = content.split(PARAGRAPH_SPLIT)[0];
  return (first || "").trim();
};
const mergeHookIntoContent = (content, hook) => {
  const normalizedHook = hook.replace(/\s+/g, " ").trim();
  if (!content) {
    return normalizedHook;
  }
  const parts = content.split(PARAGRAPH_SPLIT);
  if (!parts.length) {
    return normalizedHook;
  }
  parts[0] = normalizedHook;
  const trimmed = parts.map((part, idx) => idx === 0 ? part.trim() : part.trimEnd());
  return trimmed.join("\n\n").trimEnd();
};
function ScheduleDialog({
  disabled,
  triggerTitle,
  scheduleInfo,
  onSchedule,
  onUnschedule,
  isScheduling,
  isUnscheduling
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState();
  const [timeValue, setTimeValue] = useState("09:00");
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const timeInputId = useId();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  useEffect(() => {
    if (!open) {
      return;
    }
    if (scheduleInfo == null ? void 0 : scheduleInfo.scheduledAt) {
      setSelectedDate(scheduleInfo.scheduledAt);
      setTimeValue(format(scheduleInfo.scheduledAt, "HH:mm"));
    } else {
      const nextHour = getNextHourSlot();
      const today = startOfToday();
      const nextHourDate = new Date(nextHour.getFullYear(), nextHour.getMonth(), nextHour.getDate());
      setSelectedDate(nextHourDate.getTime() === today.getTime() ? today : nextHourDate);
      setTimeValue(format(nextHour, "HH:mm"));
    }
    setError(null);
  }, [open, scheduleInfo == null ? void 0 : scheduleInfo.scheduledAt]);
  const publishing = (scheduleInfo == null ? void 0 : scheduleInfo.status) === "publishing";
  const busy = working || isScheduling || isUnscheduling || publishing;
  const canUnschedule = Boolean((scheduleInfo == null ? void 0 : scheduleInfo.status) || (scheduleInfo == null ? void 0 : scheduleInfo.scheduledAt));
  const handleOpenChange = (next) => {
    if (disabled && next) {
      return;
    }
    setOpen(next);
  };
  const handleConfirm = async () => {
    if (!selectedDate || !timeValue) {
      setError("Please pick date and time");
      return;
    }
    const [hourStr, minStr] = timeValue.split(":");
    const h = Number(hourStr);
    const m = Number(minStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      setError("Invalid time");
      return;
    }
    const date = new Date(selectedDate);
    date.setHours(h, m, 0, 0);
    if (date.getTime() <= Date.now()) {
      setError("Scheduled time must be in the future");
      return;
    }
    setWorking(true);
    try {
      await onSchedule(date);
      setOpen(false);
    } catch {
    } finally {
      setWorking(false);
    }
  };
  const handleUnschedule = async () => {
    setWorking(true);
    try {
      await onUnschedule();
      setOpen(false);
    } finally {
      setWorking(false);
    }
  };
  const triggerHint = disabled ? publishing ? "Publishing in progress" : "Please wait for scheduling to complete" : triggerTitle;
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: handleOpenChange, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: disabled || busy, title: triggerHint, children: (scheduleInfo == null ? void 0 : scheduleInfo.status) === "scheduled" && (scheduleInfo == null ? void 0 : scheduleInfo.scheduledAt) ? "Scheduled" : "Schedule" }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Schedule post" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Choose a future date and time. Times use your timezone (",
          timezone,
          ")."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 py-4", children: [
        /* @__PURE__ */ jsx(
          Calendar,
          {
            mode: "single",
            selected: selectedDate,
            onSelect: (date) => setSelectedDate(date != null ? date : void 0),
            disabled: (date) => date < startOfToday(),
            initialFocus: true
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: timeInputId, children: "Time" }),
          /* @__PURE__ */ jsx(Input, { id: timeInputId, type: "time", value: timeValue, onChange: (e) => setTimeValue(e.target.value) })
        ] }),
        error ? /* @__PURE__ */ jsx("p", { className: "text-xs text-red-600", children: error }) : null
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsxs("div", { className: "flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
        canUnschedule ? /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: handleUnschedule, disabled: busy, children: isUnscheduling || working ? "Unscheduling\u2026" : "Unschedule" }) : /* @__PURE__ */ jsx("span", { className: "hidden sm:block" }),
        /* @__PURE__ */ jsx(Button, { type: "button", onClick: handleConfirm, disabled: busy, children: isScheduling || working ? "Scheduling\u2026" : "Confirm schedule" })
      ] }) })
    ] })
  ] });
}
function ScheduleSummary({ info }) {
  if (!info) {
    return null;
  }
  const { status, scheduledAt, error, attemptedAt, postStatus, publishedAt } = info;
  if (postStatus === "published") {
    return /* @__PURE__ */ jsxs("div", { className: "text-xs text-emerald-600", children: [
      "Published",
      publishedAt ? ` ${format(publishedAt, "PPpp")}` : "",
      publishedAt ? ` (${formatDistanceToNow(publishedAt, { addSuffix: true })})` : ""
    ] });
  }
  if (status === "scheduled" && scheduledAt) {
    return /* @__PURE__ */ jsxs("div", { className: "text-xs text-emerald-600", children: [
      "Scheduled for ",
      format(scheduledAt, "PPpp"),
      " (",
      formatDistanceToNow(scheduledAt, { addSuffix: true }),
      ")"
    ] });
  }
  if (status === "publishing") {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-xs text-sky-600", children: [
      /* @__PURE__ */ jsx("div", { children: "Publishing in progress\u2026" }),
      scheduledAt ? /* @__PURE__ */ jsxs("div", { className: "text-sky-500/80", children: [
        "Scheduled for ",
        format(scheduledAt, "PPpp")
      ] }) : null
    ] });
  }
  if (status === "failed") {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-xs text-red-600", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        "Publish attempt failed",
        error ? `: ${error}` : "."
      ] }),
      attemptedAt ? /* @__PURE__ */ jsxs("div", { className: "text-red-500/80", children: [
        "Attempted ",
        formatDistanceToNow(attemptedAt, { addSuffix: true })
      ] }) : null
    ] });
  }
  return null;
}
function Drawer({
  ...props
}) {
  return /* @__PURE__ */ jsx(Drawer$1.Root, { "data-slot": "drawer", ...props });
}
function DrawerPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx(Drawer$1.Portal, { "data-slot": "drawer-portal", ...props });
}
function DrawerOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Drawer$1.Overlay,
    {
      "data-slot": "drawer-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function DrawerContent({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(DrawerPortal, { "data-slot": "drawer-portal", children: [
    /* @__PURE__ */ jsx(DrawerOverlay, {}),
    /* @__PURE__ */ jsxs(
      Drawer$1.Content,
      {
        "data-slot": "drawer-content",
        className: cn(
          "group/drawer-content bg-background fixed z-50 flex h-full flex-col overflow-y-auto",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        ),
        ...props,
        children: [
          /* @__PURE__ */ jsx("div", { className: "bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" }),
          children
        ]
      }
    )
  ] });
}
function DrawerHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "drawer-header",
      className: cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left",
        className
      ),
      ...props
    }
  );
}
function DrawerTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Drawer$1.Title,
    {
      "data-slot": "drawer-title",
      className: cn("text-foreground font-semibold", className),
      ...props
    }
  );
}
function DrawerDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Drawer$1.Description,
    {
      "data-slot": "drawer-description",
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}
function ScrollArea({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(
    ScrollAreaPrimitive.Root,
    {
      "data-slot": "scroll-area",
      className: cn("relative", className),
      ...props,
      children: [
        /* @__PURE__ */ jsx(
          ScrollAreaPrimitive.Viewport,
          {
            "data-slot": "scroll-area-viewport",
            className: "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
            children
          }
        ),
        /* @__PURE__ */ jsx(ScrollBar, {}),
        /* @__PURE__ */ jsx(ScrollAreaPrimitive.Corner, {})
      ]
    }
  );
}
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}) {
  return /* @__PURE__ */ jsx(
    ScrollAreaPrimitive.ScrollAreaScrollbar,
    {
      "data-slot": "scroll-area-scrollbar",
      orientation,
      className: cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        ScrollAreaPrimitive.ScrollAreaThumb,
        {
          "data-slot": "scroll-area-thumb",
          className: "bg-border relative flex-1 rounded-full"
        }
      )
    }
  );
}
function Checkbox({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    CheckboxPrimitive.Root,
    {
      "data-slot": "checkbox",
      className: cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        CheckboxPrimitive.Indicator,
        {
          "data-slot": "checkbox-indicator",
          className: "flex items-center justify-center text-current transition-none",
          children: /* @__PURE__ */ jsx(CheckIcon, { className: "size-3.5" })
        }
      )
    }
  );
}
function useHookFrameworks(enabled) {
  return usePostsFrameworks({
    query: {
      enabled,
      staleTime: 1e3 * 60 * 30
    }
  });
}
function limitSelection(current, nextId, checked) {
  if (checked) {
    if (current.includes(nextId)) {
      return current;
    }
    if (current.length >= 5) {
      return current;
    }
    return [...current, nextId];
  }
  return current.filter((id) => id !== nextId);
}
function HookWorkbenchDrawer({
  open,
  onOpenChange,
  post,
  baseContent,
  onApplyHook
}) {
  var _a2, _b2, _c, _d, _e, _f, _g, _h, _i;
  const frameworksQuery = useHookFrameworks(open);
  const frameworks = (_b2 = (_a2 = frameworksQuery.data) == null ? void 0 : _a2.frameworks) != null ? _b2 : [];
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState([]);
  const [customFocus, setCustomFocus] = useState("");
  const [count, setCount] = useState(3);
  const [previewId, setPreviewId] = useState(null);
  useEffect(() => {
    if (open && frameworks.length && selectedFrameworkIds.length === 0) {
      const defaults = frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id);
      setSelectedFrameworkIds(defaults);
    }
  }, [open, frameworks, selectedFrameworkIds.length]);
  useEffect(() => {
    if (!open) {
      setPreviewId(null);
      setCustomFocus("");
    }
  }, [open]);
  const mutation = useMutation({
    mutationFn: (vars) => {
      if (!post) {
        throw new Error("No post selected");
      }
      return postsHookWorkbench(post.id, vars);
    },
    onError: (error) => {
      const message = "error" in error ? error.error || "Failed to generate hooks" : error.message;
      toast.error(message);
    }
  });
  const hooks = (_d = (_c = mutation.data) == null ? void 0 : _c.hooks) != null ? _d : [];
  useEffect(() => {
    var _a3, _b3, _c2;
    if (!hooks.length) {
      return;
    }
    if (!previewId) {
      const first = hooks[0];
      setPreviewId((_c2 = (_b3 = (_a3 = mutation.data) == null ? void 0 : _a3.recommendedId) != null ? _b3 : first == null ? void 0 : first.id) != null ? _c2 : null);
    }
  }, [hooks, previewId, (_e = mutation.data) == null ? void 0 : _e.recommendedId]);
  const previewHook = useMemo(() => {
    var _a3;
    return (_a3 = hooks.find((hook) => hook.id === previewId)) != null ? _a3 : null;
  }, [hooks, previewId]);
  const previewContent = useMemo(
    () => previewHook ? mergeHookIntoContent(baseContent, previewHook.hook) : baseContent,
    [baseContent, previewHook]
  );
  const currentHook = useMemo(() => deriveHookFromContent(baseContent), [baseContent]);
  const generateDisabled = !post || selectedFrameworkIds.length === 0 || mutation.isPending;
  const handleGenerate = () => {
    if (!post) {
      return;
    }
    const payload = {};
    if (selectedFrameworkIds.length) {
      payload.frameworkIds = selectedFrameworkIds;
    }
    if (customFocus.trim().length > 0) {
      payload.customFocus = customFocus.trim();
    }
    payload.count = count;
    mutation.mutate(payload);
  };
  const handleApply = (hook) => {
    onApplyHook(hook.hook);
    toast.success("Hook applied to draft");
    onOpenChange(false);
  };
  const resetSelection = () => {
    setSelectedFrameworkIds(frameworks.slice(0, Math.min(3, frameworks.length)).map((fw) => fw.id));
  };
  const recommendedId = (_g = (_f = mutation.data) == null ? void 0 : _f.recommendedId) != null ? _g : null;
  const summary = (_i = (_h = mutation.data) == null ? void 0 : _h.summary) != null ? _i : null;
  const FrameworkOption = ({ framework }) => {
    const checked = selectedFrameworkIds.includes(framework.id);
    return /* @__PURE__ */ jsxs("div", { className: "flex cursor-pointer flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-3 text-left hover:border-zinc-300", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked,
            onCheckedChange: (value) => setSelectedFrameworkIds(
              (cur) => limitSelection(cur, framework.id, value === true || value === "indeterminate")
            ),
            id: `fw-${framework.id}`
          }
        ),
        /* @__PURE__ */ jsx(Label, { htmlFor: `fw-${framework.id}`, children: framework.label })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs leading-relaxed text-zinc-600", children: framework.description }),
      framework.example && /* @__PURE__ */ jsxs("p", { className: "text-xs font-medium text-zinc-500", children: [
        "Example: ",
        framework.example
      ] })
    ] });
  };
  return /* @__PURE__ */ jsx(Drawer, { open, onOpenChange, direction: "right", children: /* @__PURE__ */ jsxs(DrawerContent, { className: "sm:max-w-4xl", children: [
    /* @__PURE__ */ jsxs(DrawerHeader, { className: "border-b", children: [
      /* @__PURE__ */ jsx(DrawerTitle, { children: "Hook workbench" }),
      /* @__PURE__ */ jsx(DrawerDescription, { children: "Generate hook variants grounded in your transcript insight, compare scores, and drop the winner into the draft." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-6 px-4 pb-6 pt-4", children: !post ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "No post selected" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Choose a post from the queue to explore hook options." })
    ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-[320px_1fr]", children: [
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxs(Card, { className: "gap-4", children: [
          /* @__PURE__ */ jsxs(CardHeader, { children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Frameworks" }),
            /* @__PURE__ */ jsx(CardDescription, { children: "Select up to five frameworks to explore." })
          ] }),
          /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-zinc-500", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                selectedFrameworkIds.length,
                " selected"
              ] }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: resetSelection, disabled: !frameworks.length, children: "Reset" })
            ] }),
            /* @__PURE__ */ jsx(ScrollArea, { className: "h-64 rounded-lg border bg-zinc-50", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3 p-3", children: [
              frameworks.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Loading frameworks\u2026" }),
              frameworks.map((framework) => /* @__PURE__ */ jsx(FrameworkOption, { framework }, framework.id))
            ] }) }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs uppercase tracking-wide text-zinc-500", children: "Variants to generate" }),
              /* @__PURE__ */ jsx(
                ToggleGroup,
                {
                  type: "single",
                  value: String(count),
                  onValueChange: (value) => {
                    if (!value) {
                      return;
                    }
                    setCount(Number(value));
                  },
                  className: "flex gap-2",
                  children: [3, 4, 5].map((option) => /* @__PURE__ */ jsx(
                    ToggleGroupItem,
                    {
                      value: String(option),
                      className: "flex-1",
                      children: option
                    },
                    option
                  ))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs uppercase tracking-wide text-zinc-500", children: "Focus (optional)" }),
              /* @__PURE__ */ jsx(
                Textarea,
                {
                  value: customFocus,
                  onChange: (event) => setCustomFocus(event.target.value),
                  placeholder: "e.g. Highlight the measurable client outcome from the leadership sprint",
                  className: "min-h-24 resize-none text-sm",
                  maxLength: 240
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "text-right text-xs text-zinc-400", children: [
                customFocus.length,
                "/240"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs uppercase tracking-wide text-zinc-500", children: "Current opening" }),
              /* @__PURE__ */ jsx("p", { className: "rounded-md border bg-white p-3 text-sm leading-relaxed text-zinc-700", children: currentHook || "Draft does not have an opening line yet." })
            ] }),
            /* @__PURE__ */ jsxs(Button, { onClick: handleGenerate, disabled: generateDisabled, className: "w-full", children: [
              mutation.isPending && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
              "Generate hooks"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          mutation.isPending && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500", children: "Thinking through fresh hooks\u2026" }),
          !mutation.isPending && hooks.length === 0 && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500", children: "Choose frameworks and generate to see ranked hook options." }),
          summary && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardHeader, { children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "AI takeaways" }),
            /* @__PURE__ */ jsx(CardDescription, { children: summary })
          ] }) }),
          hooks.map((hook) => {
            const isRecommended = recommendedId === hook.id;
            const isPreviewing = previewId === hook.id;
            return /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsxs(CardHeader, { className: "gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: hook.label }),
                    isRecommended && /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Recommended" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "text-xs text-zinc-500", children: [
                    "Curiosity ",
                    hook.curiosity,
                    " \xB7 Value ",
                    hook.valueAlignment
                  ] })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-base font-medium leading-snug text-zinc-900", children: hook.hook })
              ] }),
              /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-medium uppercase tracking-wide text-zinc-500", children: "Curiosity" }),
                    /* @__PURE__ */ jsx(Progress, { value: hook.curiosity, className: "h-2" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-medium uppercase tracking-wide text-zinc-500", children: "Value alignment" }),
                    /* @__PURE__ */ jsx(Progress, { value: hook.valueAlignment, className: "h-2" })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-sm leading-relaxed text-zinc-600", children: hook.rationale })
              ] }),
              /* @__PURE__ */ jsxs(CardFooter, { className: "justify-between gap-3", children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: isPreviewing ? "default" : "outline",
                    size: "sm",
                    onClick: () => setPreviewId(hook.id),
                    children: isPreviewing ? "Previewing" : "Preview"
                  }
                ),
                /* @__PURE__ */ jsx(Button, { variant: "secondary", size: "sm", onClick: () => handleApply(hook), children: "Use hook" })
              ] })
            ] }, hook.id);
          })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "A/B preview" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Compare how the selected hook rewrites the opening before committing it to the post." })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "rounded-lg border bg-white p-4 text-sm leading-relaxed text-zinc-700", children: previewHook ? previewContent : "Select a hook to preview the updated draft." }) })
      ] })
    ] }) })
  ] }) });
}
function PostEditor({
  post,
  linkedInConnected,
  onSave,
  onSetStatus,
  onPublish,
  onSchedule,
  onUnschedule,
  onAutoSchedule,
  isScheduling,
  isUnscheduling,
  isAutoScheduling,
  onRegenerate,
  isRegenerating
}) {
  var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const hasPost = Boolean(post);
  const currentPost = post != null ? post : null;
  const [content, setContent] = useState((_a2 = currentPost == null ? void 0 : currentPost.content) != null ? _a2 : "");
  const [hashtags, setHashtags] = useState((_b2 = currentPost == null ? void 0 : currentPost.hashtags) != null ? _b2 : []);
  const [baseContent, setBaseContent] = useState((_c = currentPost == null ? void 0 : currentPost.content) != null ? _c : "");
  const [baseTags, setBaseTags] = useState((_d = currentPost == null ? void 0 : currentPost.hashtags) != null ? _d : []);
  const [saving, setSaving] = useState(false);
  const [hookWorkbenchOpen, setHookWorkbenchOpen] = useState(false);
  useEffect(() => {
    if (!currentPost) {
      return;
    }
    setContent(currentPost.content);
    setHashtags(currentPost.hashtags);
    setBaseContent(currentPost.content);
    setBaseTags(currentPost.hashtags);
  }, [currentPost]);
  const dirty = content !== baseContent || JSON.stringify(hashtags) !== JSON.stringify(baseTags);
  const canSchedule = hasPost && (currentPost == null ? void 0 : currentPost.status) === "approved" && linkedInConnected;
  const scheduleInfo = hasPost ? {
    scheduledAt: (_e = currentPost == null ? void 0 : currentPost.scheduledAt) != null ? _e : null,
    status: (_f = currentPost == null ? void 0 : currentPost.scheduleStatus) != null ? _f : null,
    error: (_g = currentPost == null ? void 0 : currentPost.scheduleError) != null ? _g : null,
    attemptedAt: (_h = currentPost == null ? void 0 : currentPost.scheduleAttemptedAt) != null ? _h : null,
    postStatus: (_i = currentPost == null ? void 0 : currentPost.status) != null ? _i : "pending",
    publishedAt: (_j = currentPost == null ? void 0 : currentPost.publishedAt) != null ? _j : null
  } : {
    scheduledAt: null,
    status: null,
    error: null,
    attemptedAt: null,
    postStatus: "pending",
    publishedAt: null
  };
  const isPublishing = scheduleInfo.status === "publishing";
  const actionsBlocked = dirty || saving;
  const scheduleDisabledReason = !canSchedule ? hasPost && (currentPost == null ? void 0 : currentPost.status) === "published" ? "Post already published" : "Approve the post and connect LinkedIn before scheduling" : actionsBlocked ? "Save changes before scheduling" : void 0;
  const publishDisabled = !canSchedule || actionsBlocked || isScheduling || isUnscheduling || isPublishing;
  const handleSave = async () => {
    if (!dirty || saving) {
      return;
    }
    setSaving(true);
    try {
      const maybe = onSave(content.slice(0, 3e3), hashtags);
      if (isPromiseLike(maybe)) {
        await maybe;
      }
      setBaseContent(content);
      setBaseTags(hashtags);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs(Card, { className: "h-full overflow-hidden flex flex-col", children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx("span", { className: "font-medium text-zinc-900", children: hasPost ? "" : "Select a post to edit" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        hasPost && /* @__PURE__ */ jsx("div", { className: "hidden sm:flex", children: /* @__PURE__ */ jsxs(
          ToggleGroup,
          {
            type: "single",
            value: (_k = currentPost == null ? void 0 : currentPost.status) != null ? _k : "pending",
            onValueChange: (value) => isModerationStatus(value) && onSetStatus(value),
            children: [
              /* @__PURE__ */ jsx(ToggleGroupItem, { value: "pending", children: "Pending" }),
              /* @__PURE__ */ jsx(ToggleGroupItem, { value: "approved", children: "Approved" }),
              /* @__PURE__ */ jsx(ToggleGroupItem, { value: "rejected", children: "Rejected" }),
              /* @__PURE__ */ jsx(ToggleGroupItem, { value: "published", disabled: true, children: "Published" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => setHookWorkbenchOpen(true), disabled: !hasPost, children: "Hook Workbench" }),
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", onClick: onRegenerate, disabled: saving || !hasPost || isRegenerating, children: "Regenerate" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "flex-1 flex flex-col overflow-hidden space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-h-0", children: [
        /* @__PURE__ */ jsx(
          Textarea,
          {
            className: "h-full w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto resize-none",
            value: content,
            onChange: (e) => setContent(e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center justify-between text-xs text-zinc-600", children: [
          /* @__PURE__ */ jsxs("span", { className: "tabular-nums text-zinc-500", children: [
            content.length,
            "/3000"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            !dirty && !saving && hasPost && /* @__PURE__ */ jsx("span", { className: "text-zinc-500", children: "Saved" }),
            /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", disabled: !hasPost || !dirty || saving, onClick: handleSave, children: saving ? "Saving\u2026" : "Save" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(HashtagEditor, { value: hashtags, onChange: setHashtags }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap justify-end", children: [
        /* @__PURE__ */ jsx(
          ScheduleDialog,
          {
            disabled: !hasPost || !canSchedule || actionsBlocked,
            triggerTitle: scheduleDisabledReason,
            scheduleInfo,
            onSchedule,
            onUnschedule,
            isScheduling,
            isUnscheduling
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "hidden sm:flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "secondary",
              disabled: !hasPost || !canSchedule || actionsBlocked || isAutoScheduling,
              title: scheduleDisabledReason,
              onClick: () => onAutoSchedule(),
              children: isAutoScheduling ? "Auto-scheduling\u2026" : "Auto-schedule"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "default",
              disabled: !hasPost || publishDisabled,
              title: dirty ? "Please save changes before publishing" : publishDisabled && (isScheduling || isUnscheduling) ? "Please wait for scheduling to complete" : publishDisabled && isPublishing ? "Publishing in progress" : void 0,
              onClick: onPublish,
              children: "Publish Now"
            }
          )
        ] })
      ] }),
      hasPost && /* @__PURE__ */ jsx(ScheduleSummary, { info: scheduleInfo })
    ] }),
    /* @__PURE__ */ jsx(
      HookWorkbenchDrawer,
      {
        open: hookWorkbenchOpen,
        onOpenChange: setHookWorkbenchOpen,
        post,
        baseContent: content,
        onApplyHook: (hookText) => setContent((current) => mergeHookIntoContent(current, hookText))
      }
    )
  ] });
}
function RegenerateModal({ open, onOpenChange, onSubmit, disabled }) {
  const [customInstructions, setCustomInstructions] = useState("");
  const [postType, setPostType] = useState(void 0);
  return /* @__PURE__ */ jsx(DialogPrimitive.Root, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogPrimitive.Portal, { children: [
    /* @__PURE__ */ jsx(DialogPrimitive.Overlay, { className: "fixed inset-0 bg-black/20" }),
    /* @__PURE__ */ jsxs(DialogPrimitive.Content, { className: "fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white p-4 shadow", children: [
      /* @__PURE__ */ jsx(DialogPrimitive.Title, { className: "text-lg font-medium mb-2", children: "Regenerate with custom instructions" }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "regen-posttype", children: "Post type (optional)" }),
          /* @__PURE__ */ jsxs(Select, { value: postType || "", onValueChange: (v) => setPostType(v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { id: "regen-posttype", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select a preset" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "story", children: "Story" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "how_to", children: "How-to" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "myth_bust", children: "Myth-bust" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "listicle", children: "Listicle" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "case_study", children: "Case study" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "announcement", children: "Announcement" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-field", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "regen-custom", children: "Custom instructions (optional)" }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              id: "regen-custom",
              className: "h-40",
              value: customInstructions,
              onChange: (e) => setCustomInstructions(e.target.value),
              placeholder: "Add specific guidance for this regenerate run\u2026"
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-xs text-zinc-500", children: "You can leave fields blank to reuse your default style." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-end gap-2", children: [
        /* @__PURE__ */ jsx(DialogPrimitive.Close, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Cancel" }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            disabled,
            onClick: () => {
              onSubmit({
                customInstructions: customInstructions.trim() ? customInstructions : void 0,
                postType
              });
              onOpenChange(false);
            },
            children: "Regenerate"
          }
        )
      ] })
    ] })
  ] }) });
}
function PostsPanel({
  projectId,
  postsQuery,
  linkedInConnected,
  onSetStatus,
  onSavePost,
  onPublish,
  onBulk,
  onSchedule,
  onUnschedule,
  onAutoSchedule,
  onProjectAutoSchedule,
  projectAutoSchedulePending,
  schedulePendingId,
  unschedulePendingId,
  autoschedulePendingId,
  onAllReviewed
}) {
  var _a2, _b2, _c;
  const [selected, setSelected] = useState([]);
  const bulkRegenMutation = useBulkRegeneratePosts(projectId);
  const [regenBusy, setRegenBusy] = useState(/* @__PURE__ */ new Set());
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenIds, setRegenIds] = useState(null);
  const items = (_b2 = (_a2 = postsQuery.data) == null ? void 0 : _a2.items) != null ? _b2 : [];
  useEffect(() => {
    if (items.length > 0 && items.every((post) => post.status !== "pending")) {
      onAllReviewed();
    }
  }, [items, onAllReviewed]);
  useEffect(() => {
    if (selectedPostId === null && items.length > 0) {
      const firstPost = items[0];
      if (firstPost) {
        setSelectedPostId(firstPost.id);
      }
    }
  }, [items, selectedPostId]);
  if (postsQuery.isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-28 w-full" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-28 w-full" })
    ] });
  }
  if (items.length === 0) {
    return /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "No posts yet." });
  }
  const toggleSelect = (id) => setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const allIds = items.map((post) => post.id);
  const allSelected = selected.length > 0 && selected.length === items.length;
  const someSelected = selected.length > 0 && selected.length < items.length;
  const hasSelection = selected.length > 0;
  const openRegenerate = (ids) => {
    setRegenIds(ids);
    setRegenOpen(true);
  };
  const submitRegenerate = ({ customInstructions, postType }) => {
    const ids = regenIds || [];
    if (!ids.length) {
      return;
    }
    setRegenBusy((cur) => /* @__PURE__ */ new Set([...Array.from(cur), ...ids]));
    bulkRegenMutation.mutate(
      { ids, customInstructions, postType },
      {
        onSettled: () => setRegenBusy((cur) => {
          const next = new Set(cur);
          for (const id of ids) {
            next.delete(id);
          }
          return next;
        })
      }
    );
  };
  const startConnect = async () => {
    try {
      const { url } = await linkedInAuth0();
      window.location.href = url;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start LinkedIn OAuth"));
    }
  };
  const anyRegenInProgress = bulkRegenMutation.isPending || regenBusy.size > 0;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      !linkedInConnected && /* @__PURE__ */ jsx("div", { className: "rounded-md border bg-white p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-700", children: "Connect LinkedIn to enable one-click publishing." }),
        /* @__PURE__ */ jsx(Button, { size: "sm", onClick: startConnect, children: "Connect LinkedIn" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm text-zinc-700", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              className: "h-4 w-4 rounded border-zinc-300",
              checked: allSelected,
              ref: (el) => {
                if (el) {
                  el.indeterminate = someSelected;
                }
              },
              onChange: (e) => {
                if (e.target.checked) {
                  setSelected(allIds);
                } else {
                  setSelected([]);
                }
              }
            }
          ),
          /* @__PURE__ */ jsx("span", { children: hasSelection ? `${selected.length} selected` : `${items.length} posts` })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "default",
              onClick: () => onBulk(hasSelection ? selected : allIds, "approved"),
              disabled: items.length === 0 || hasSelection && selected.length === 0,
              children: hasSelection ? "Approve Selected" : "Approve All"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "outline",
              onClick: () => onBulk(hasSelection ? selected : allIds, "pending"),
              disabled: items.length === 0 || hasSelection && selected.length === 0,
              children: hasSelection ? "Mark Pending" : "Mark All Pending"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "outline",
              onClick: () => onBulk(hasSelection ? selected : allIds, "rejected"),
              disabled: items.length === 0 || hasSelection && selected.length === 0,
              children: hasSelection ? "Reject Selected" : "Reject All"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              variant: "secondary",
              onClick: () => openRegenerate(hasSelection ? selected : allIds),
              disabled: items.length === 0 || anyRegenInProgress || hasSelection && selected.length === 0,
              children: bulkRegenMutation.isPending ? "Regenerating\u2026" : hasSelection ? "Regenerate Selected" : "Regenerate All"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              size: "sm",
              onClick: () => onProjectAutoSchedule(),
              disabled: !linkedInConnected || projectAutoSchedulePending,
              title: !linkedInConnected ? "Connect LinkedIn before autoscheduling" : void 0,
              children: projectAutoSchedulePending ? "Auto-scheduling\u2026" : "Auto-schedule Approved"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 flex gap-4 h-[calc(100vh-240px)] min-h-[360px] overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "w-80 shrink-0 h-full overflow-y-auto border rounded-md bg-white", children: /* @__PURE__ */ jsx(
          PostQueue,
          {
            posts: items,
            selectedPostId,
            selectedSet: new Set(selected),
            onSelect: (id) => setSelectedPostId(id),
            onToggleSelect: (id) => toggleSelect(id)
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 h-full overflow-hidden", children: /* @__PURE__ */ jsx(
          PostEditor,
          {
            post: (_c = items.find((p) => p.id === selectedPostId)) != null ? _c : null,
            linkedInConnected,
            onSave: (content, hashtags) => {
              const id = selectedPostId;
              if (!id) {
                return;
              }
              return onSavePost(id, content, hashtags);
            },
            onSetStatus: (status) => {
              const id = selectedPostId;
              if (!id) {
                return;
              }
              onSetStatus(id, status);
            },
            onPublish: () => {
              const id = selectedPostId;
              if (!id) {
                return;
              }
              onPublish(id);
            },
            onSchedule: (date) => {
              const id = selectedPostId;
              if (!id) {
                return Promise.resolve();
              }
              return onSchedule(id, date);
            },
            onUnschedule: () => {
              const id = selectedPostId;
              if (!id) {
                return Promise.resolve();
              }
              return onUnschedule(id);
            },
            onAutoSchedule: () => {
              const id = selectedPostId;
              if (!id) {
                return Promise.resolve();
              }
              return onAutoSchedule(id);
            },
            isScheduling: schedulePendingId === selectedPostId,
            isUnscheduling: unschedulePendingId === selectedPostId,
            isAutoScheduling: autoschedulePendingId === selectedPostId,
            isRegenerating: selectedPostId != null ? regenBusy.has(selectedPostId) || bulkRegenMutation.isPending : false,
            onRegenerate: () => {
              const id = selectedPostId;
              if (!id) {
                return;
              }
              openRegenerate([id]);
            }
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(RegenerateModal, { open: regenOpen, onOpenChange: setRegenOpen, onSubmit: submitRegenerate, disabled: anyRegenInProgress })
  ] });
}
function InlineTitle({
  title,
  onChange,
  onSave
}) {
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState("idle");
  useEffect(() => setValue(title), [title]);
  useEffect(() => {
    if (value === title) {
      return;
    }
    let resetTimeout = null;
    const id = window.setTimeout(async () => {
      try {
        setSaving("saving");
        onChange(value);
        await onSave(value);
        setSaving("saved");
        resetTimeout = window.setTimeout(() => setSaving("idle"), 800);
      } catch {
        setSaving("idle");
      }
    }, 600);
    return () => {
      window.clearTimeout(id);
      if (resetTimeout !== null) {
        window.clearTimeout(resetTimeout);
      }
    };
  }, [onChange, onSave, title, value]);
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        value,
        onChange: (e) => setValue(e.target.value),
        className: "w-full bg-transparent text-2xl font-semibold outline-none focus:border-b focus:border-zinc-300"
      }
    ),
    /* @__PURE__ */ jsx("span", { className: "text-xs text-zinc-500 min-w-16 text-right", children: saving === "saving" ? "Saving\u2026" : saving === "saved" ? "Saved" : "" })
  ] });
}
function ProjectDetailPage() {
  var _a2, _b2, _c, _d, _e, _f, _g, _h;
  const {
    projectId
  } = useParams({
    strict: false
  });
  const id = projectId;
  const navigate = useNavigate({
    from: "/projects/$projectId"
  });
  const routerState = useRouterState();
  const searchDetails = routerState.location.search;
  const searchObj = searchDetails && typeof searchDetails === "object" && !Array.isArray(searchDetails) ? searchDetails : void 0;
  const tabParam = (typeof (searchObj == null ? void 0 : searchObj.tab) === "string" ? searchObj.tab : void 0) || new URLSearchParams((_a2 = routerState.location.searchStr) != null ? _a2 : "").get("tab");
  const urlTab = tabParam === "transcript" ? "transcript" : tabParam === "posts" ? "posts" : null;
  const loaderData = Route$1.useLoaderData();
  const [title, setTitle] = useState(loaderData.project.project.title);
  const [stage, setStage] = useState(loaderData.project.project.currentStage);
  const initialProgress = loaderData.project.project.currentStage === "processing" ? (_b2 = loaderData.project.project.processingProgress) != null ? _b2 : 0 : 0;
  const initialStatus = loaderData.project.project.currentStage === "processing" ? loaderData.project.project.processingStep ? String(loaderData.project.project.processingStep).replaceAll("_", " ") : "Starting\u2026" : "Waiting to start\u2026";
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState(initialStatus);
  const [activeTab, setActiveTab] = useState("transcript");
  const hasQueuedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasFailedRef = useRef(false);
  const updatingStageRef = useRef(false);
  const {
    data: linkedInStatus
  } = useLinkedInStatus(loaderData.linkedIn);
  const [postsEnabled, setPostsEnabled] = useState(loaderData.project.project.currentStage !== "processing");
  const postsQuery = useProjectPosts(id, postsEnabled, loaderData.posts);
  useRealtimePosts(id, loaderData.project.project.userId);
  const transcriptQuery = useTranscript(id, loaderData.transcript);
  const [transcriptValue, setTranscriptValue] = useState((_d = (_c = loaderData.transcript) == null ? void 0 : _c.transcript) != null ? _d : "");
  useEffect(() => {
    var _a3, _b3;
    const next = (_b3 = (_a3 = transcriptQuery.data) == null ? void 0 : _a3.transcript) != null ? _b3 : "";
    setTranscriptValue(next);
  }, [(_e = transcriptQuery.data) == null ? void 0 : _e.transcript]);
  useEffect(() => {
    const pathname = routerState.location.pathname;
    const onDetail = pathname === `/projects/${id}`;
    if (!onDetail) {
      return;
    }
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
      return;
    }
    if (!urlTab) {
      navigate({
        to: ".",
        search: {
          tab: activeTab
        },
        replace: true
      });
    }
  }, [urlTab, activeTab, id, routerState.location.pathname, navigate]);
  const updatePostMutation = useUpdatePost(id);
  const bulkSetStatusMutation = useBulkSetStatus(id);
  const publishNowMutation = usePublishNow(id);
  const schedulePostMutation = useSchedulePost(id);
  const unschedulePostMutation = useUnschedulePost(id);
  const autoschedulePostMutation = useAutoschedulePost(id);
  const autoscheduleProjectMutation = useAutoscheduleProject(id);
  const updateTranscriptMutation = useUpdateTranscript(id);
  useEffect(() => {
    if (stage === "processing") {
      setPostsEnabled(false);
      hasQueuedRef.current = false;
      hasCompletedRef.current = false;
      hasFailedRef.current = false;
      return;
    }
    setPostsEnabled(true);
    hasQueuedRef.current = false;
    hasCompletedRef.current = false;
    hasFailedRef.current = false;
  }, [stage]);
  useEffect(() => {
    if (stage !== "processing" || hasQueuedRef.current) {
      return;
    }
    hasQueuedRef.current = true;
    hasCompletedRef.current = false;
    hasFailedRef.current = false;
    setStatus((current) => current && current !== "Waiting to start\u2026" ? current : "Starting\u2026");
    setProgress((current) => current > 0 ? current : 1);
    projectsProcess(id).catch((error) => {
      console.error("Failed to start project processing", error);
      hasQueuedRef.current = false;
      toast.error("Failed to start processing project");
    });
  }, [id, stage]);
  const describeProcessingStep = (step) => {
    switch (step) {
      case "queued":
        return "Queued";
      case "started":
        return "Processing started";
      case "normalize_transcript":
        return "Normalizing transcript";
      case "generate_insights":
        return "Generating insights";
      case "insights_ready":
        return "Insights ready";
      case "posts_ready":
        return "Post drafts ready";
      case "complete":
        return "Complete";
      default:
        return step ? step.replaceAll("_", " ") : "Processing\u2026";
    }
  };
  useProjectProcessingRealtime(stage === "processing" ? id : null, {
    enabled: stage === "processing",
    onProgress: ({
      progress: currentProgress,
      step
    }) => {
      setProgress((previous) => {
        const value = Number.isFinite(currentProgress) ? currentProgress : previous;
        const clamped = Math.max(0, Math.min(99, value));
        return Math.max(previous, clamped);
      });
      if (step) {
        setStatus(describeProcessingStep(step));
        if (step === "posts_ready") {
          setPostsEnabled(true);
        }
      }
    },
    onCompleted: () => {
      if (hasCompletedRef.current) {
        return;
      }
      hasCompletedRef.current = true;
      hasFailedRef.current = false;
      setStatus("Complete");
      setProgress(100);
      setStage("posts");
      setActiveTab("posts");
      navigate({
        to: ".",
        search: {
          tab: "posts"
        }
      });
      setPostsEnabled(true);
      toast.success("Posts are ready for review", {
        description: "Your content has been processed and is ready to review."
      });
    },
    onFailed: ({
      message
    }) => {
      if (hasFailedRef.current) {
        return;
      }
      hasFailedRef.current = true;
      hasCompletedRef.current = false;
      setStatus(message != null ? message : "Processing failed");
      setPostsEnabled(false);
      toast.error(message != null ? message : "Processing failed");
    }
  });
  const schedulePendingId = schedulePostMutation.isPending && ((_f = schedulePostMutation.variables) == null ? void 0 : _f.postId) ? schedulePostMutation.variables.postId : null;
  const unschedulePendingId = unschedulePostMutation.isPending && ((_g = unschedulePostMutation.variables) == null ? void 0 : _g.postId) ? unschedulePostMutation.variables.postId : null;
  const autoschedulePendingId = autoschedulePostMutation.isPending && ((_h = autoschedulePostMutation.variables) == null ? void 0 : _h.id) ? autoschedulePostMutation.variables.id : null;
  return /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(InlineTitle, { title: title || "Untitled Project", onChange: (val) => setTitle(val), onSave: (val) => projectsUpdate({
          id,
          data: {
            title: val
          }
        }).then(() => void 0) }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-zinc-600", children: [
          "Stage: ",
          stage
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => navigate({
          to: "/projects"
        }), children: "Back to Projects" }),
        /* @__PURE__ */ jsx(ProjectDeleteButton, { projectId: id, projectTitle: title || "Project", variant: "destructive", size: "sm", onDeleted: () => navigate({
          to: "/projects"
        }) })
      ] })
    ] }),
    stage === "processing" && /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-md border bg-white px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium text-zinc-800", children: status }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-zinc-500", children: [
          progress,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 h-2 w-full overflow-hidden rounded bg-zinc-100", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-zinc-800 transition-all", style: {
        width: `${progress}%`
      } }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-zinc-500", children: "Processing." })
    ] }),
    /* @__PURE__ */ jsxs(Tabs, { value: activeTab, onValueChange: (next) => {
      if (next === "transcript" || next === "posts") {
        setActiveTab(next);
        navigate({
          to: ".",
          search: {
            tab: next
          }
        });
      }
    }, children: [
      /* @__PURE__ */ jsxs(TabsList, { children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "transcript", children: "Transcript" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "posts", children: "Posts" })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "posts", className: "mt-4 space-y-3", children: /* @__PURE__ */ jsx(PostsPanel, { projectId: id, postsQuery, linkedInConnected: !!(linkedInStatus == null ? void 0 : linkedInStatus.connected), onSetStatus: (postId, status2) => updatePostMutation.mutate({
        postId,
        data: {
          status: status2
        }
      }), onSavePost: (postId, content, hashtags) => updatePostMutation.mutateAsync({
        postId,
        data: {
          content,
          hashtags
        }
      }).then(() => void 0), onPublish: (postId) => publishNowMutation.mutate(postId), onProjectAutoSchedule: () => autoscheduleProjectMutation.mutate({}), projectAutoSchedulePending: autoscheduleProjectMutation.isPending, onBulk: (ids, status2) => bulkSetStatusMutation.mutate({
        ids,
        status: status2
      }), onSchedule: (postId, scheduledAt) => schedulePostMutation.mutateAsync({
        postId,
        scheduledAt
      }).then(() => void 0), onUnschedule: (postId) => unschedulePostMutation.mutateAsync({
        postId
      }).then(() => void 0), onAutoSchedule: (postId) => autoschedulePostMutation.mutateAsync(postId).then(() => void 0), schedulePendingId: schedulePendingId != null ? schedulePendingId : void 0, unschedulePendingId: unschedulePendingId != null ? unschedulePendingId : void 0, autoschedulePendingId: autoschedulePendingId != null ? autoschedulePendingId : void 0, onAllReviewed: () => {
        if (updatingStageRef.current || stage === "ready") {
          return;
        }
        updatingStageRef.current = true;
        projectsUpdateStage({
          id,
          data: {
            nextStage: "ready"
          }
        }).then((response) => {
          var _a3;
          const next = (_a3 = response.project) == null ? void 0 : _a3.currentStage;
          setStage(next != null ? next : "ready");
        }).finally(() => {
          updatingStageRef.current = false;
        });
      } }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "transcript", className: "mt-4 space-y-3", children: transcriptQuery.isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-40 w-full" }) : /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Transcript" }) }),
        /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: "Paste or edit your transcript. It will be cleaned and used to generate posts." }),
          /* @__PURE__ */ jsx(Textarea, { className: "h-72 w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto", value: transcriptValue, onChange: (e) => setTranscriptValue(e.target.value) }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end gap-2", children: /* @__PURE__ */ jsx(Button, { onClick: () => updateTranscriptMutation.mutateAsync(transcriptValue).then(() => void 0), disabled: updateTranscriptMutation.isPending, children: updateTranscriptMutation.isPending ? "Saving\u2026" : "Save Transcript" }) })
        ] })
      ] }) })
    ] })
  ] });
}

export { ProjectDetailPage as component };
//# sourceMappingURL=projects._projectId-Dw54hHIW.mjs.map
