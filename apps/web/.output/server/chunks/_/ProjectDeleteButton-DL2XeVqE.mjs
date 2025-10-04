import { jsxs, jsx } from 'react/jsx-runtime';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { B as Button, E as buttonVariants, c as cn, M as useProjectsDelete } from './router-6_mKVCnu.mjs';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from '@tanstack/react-router';

function Progress({
  className,
  value,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    ProgressPrimitive.Root,
    {
      "data-slot": "progress",
      className: cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        ProgressPrimitive.Indicator,
        {
          "data-slot": "progress-indicator",
          className: "bg-primary h-full w-full flex-1 transition-all",
          style: { transform: `translateX(-${100 - (value || 0)}%)` }
        }
      )
    }
  );
}
function AlertDialog({
  ...props
}) {
  return /* @__PURE__ */ jsx(AlertDialogPrimitive.Root, { "data-slot": "alert-dialog", ...props });
}
function AlertDialogTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(AlertDialogPrimitive.Trigger, { "data-slot": "alert-dialog-trigger", ...props });
}
function AlertDialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx(AlertDialogPrimitive.Portal, { "data-slot": "alert-dialog-portal", ...props });
}
function AlertDialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Overlay,
    {
      "data-slot": "alert-dialog-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function AlertDialogContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxs(AlertDialogPortal, { children: [
    /* @__PURE__ */ jsx(AlertDialogOverlay, {}),
    /* @__PURE__ */ jsx(
      AlertDialogPrimitive.Content,
      {
        "data-slot": "alert-dialog-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        ),
        ...props
      }
    )
  ] });
}
function AlertDialogHeader({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "alert-dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    }
  );
}
function AlertDialogFooter({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "alert-dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props
    }
  );
}
function AlertDialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Title,
    {
      "data-slot": "alert-dialog-title",
      className: cn("text-lg font-semibold", className),
      ...props
    }
  );
}
function AlertDialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Description,
    {
      "data-slot": "alert-dialog-description",
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}
function AlertDialogAction({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Action,
    {
      className: cn(buttonVariants(), className),
      ...props
    }
  );
}
function AlertDialogCancel({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Cancel,
    {
      className: cn(buttonVariants({ variant: "outline" }), className),
      ...props
    }
  );
}
function useDeleteProject() {
  const qc = useQueryClient();
  const deleteMutation = useProjectsDelete();
  return {
    ...deleteMutation,
    mutateAsync: async (projectId) => {
      await deleteMutation.mutateAsync({ id: projectId });
      qc.removeQueries({ queryKey: ["posts", { projectId }] });
      toast.success("Project deleted");
      return projectId;
    }
  };
}
function ProjectDeleteButton({
  projectId,
  projectTitle,
  onDeleted,
  size = "sm",
  variant = "destructive",
  children = "Delete"
}) {
  const mutation = useDeleteProject();
  const qc = useQueryClient();
  const router = useRouter();
  return /* @__PURE__ */ jsxs(AlertDialog, { children: [
    /* @__PURE__ */ jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { size, variant, disabled: mutation.isPending, children: mutation.isPending ? "Deleting\u2026" : children }) }),
    /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxs(AlertDialogTitle, { children: [
          "Delete ",
          projectTitle ? `\u201C${projectTitle}\u201D` : "this project",
          "?"
        ] }),
        /* @__PURE__ */ jsx(AlertDialogDescription, { children: "This will permanently remove the project and its generated posts. This action cannot be undone." })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { disabled: mutation.isPending, children: "Cancel" }),
        /* @__PURE__ */ jsx(
          AlertDialogAction,
          {
            className: buttonVariants({ variant: "destructive" }),
            disabled: mutation.isPending,
            onClick: async () => {
              await mutation.mutateAsync(projectId);
              qc.invalidateQueries();
              try {
                await router.invalidate();
              } catch {
              }
              onDeleted == null ? void 0 : onDeleted();
            },
            children: "Delete"
          }
        )
      ] })
    ] })
  ] });
}

export { ProjectDeleteButton as P, Progress as a };
//# sourceMappingURL=ProjectDeleteButton-DL2XeVqE.mjs.map
