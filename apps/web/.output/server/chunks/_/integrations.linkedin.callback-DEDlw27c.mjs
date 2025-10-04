import { jsxs, jsx } from 'react/jsx-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

function LinkedInCallbackPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const message = params.get("message");
    if (status === "connected") {
      toast.success("LinkedIn connected");
    } else {
      toast.error(message || "LinkedIn connection failed");
    }
    qc.invalidateQueries({
      queryKey: ["linkedin", "status"]
    });
    navigate({
      to: "/settings",
      search: {
        tab: "integrations"
      }
    });
  }, [navigate, qc]);
  return /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-lg font-medium", children: "Connecting LinkedIn\u2026" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: "Finishing up and redirecting." })
  ] });
}

export { LinkedInCallbackPage as component };
//# sourceMappingURL=integrations.linkedin.callback-DEDlw27c.mjs.map
