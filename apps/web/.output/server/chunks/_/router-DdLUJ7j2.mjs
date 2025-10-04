import { jsxs, jsx } from 'react/jsx-runtime';
import { createRouter as createRouter$1, createRootRoute, createFileRoute, lazyRouteComponent, isRedirect, redirect, useLocation, Outlet, HeadContent, Scripts, useRouterState, useNavigate, Link } from '@tanstack/react-router';
import { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FolderKanban, Calendar, BarChart3, Settings, ShieldCheck, Plus, LogOut } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { useTheme } from 'next-themes';
import { Toaster as Toaster$1 } from 'sonner';

var _a, _b;
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatCurrency(amount, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      "data-slot": "separator",
      decorative,
      orientation,
      className: cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      ),
      ...props
    }
  );
}
const API_BASE = (
  // eslint-disable-next-line no-process-env, @typescript-eslint/no-explicit-any
  (_b = (_a = process == null ? void 0 : process.env) == null ? void 0 : _a.VITE_API_URL) != null ? _b : "http://api:3000"
) ;
const axiosInstance = axios.create({
  baseURL: API_BASE
});
axiosInstance.interceptors.request.use(
  async (config) => {
    var _a2, _b2;
    if (!config.headers.Accept) {
      config.headers.Accept = "application/json";
    }
    if (!config.headers["X-Requested-With"]) {
      config.headers["X-Requested-With"] = "XMLHttpRequest";
    }
    config.withCredentials = true;
    {
      try {
        const mod = await import('../virtual/entry.mjs').then(function (n) { return n.s; }).then((n) => n.s);
        const ctx = (_a2 = mod.getSSRRequestContext) == null ? void 0 : _a2.call(mod);
        const cookie = ctx == null ? void 0 : ctx.cookie;
        if (cookie && !config.headers.cookie) {
          config.headers.cookie = cookie;
        }
      } catch {
      }
    }
    ((_b2 = config.method) != null ? _b2 : "GET").toUpperCase();
    return config;
  },
  (error) => Promise.reject(error)
);
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    var _a2, _b2, _c;
    if (error.response) {
      const { data, status } = error.response;
      const apiError = {
        error: (_b2 = (_a2 = data == null ? void 0 : data.error) != null ? _a2 : error.message) != null ? _b2 : "Request failed",
        code: (_c = data == null ? void 0 : data.code) != null ? _c : "UNKNOWN_ERROR",
        status: status != null ? status : 500,
        ...(data == null ? void 0 : data.details) !== void 0 ? { details: data.details } : {}
      };
      throw apiError;
    }
    throw error;
  }
);
const customInstance = (config) => {
  return axiosInstance.request(config).then((response) => response.data);
};
const authMe = (signal) => {
  return customInstance(
    {
      url: `/auth/me`,
      method: "GET",
      signal
    }
  );
};
const authLogout = (signal) => {
  return customInstance(
    {
      url: `/auth/logout`,
      method: "POST",
      signal
    }
  );
};
const getAuthLogoutMutationOptions = (options) => {
  const mutationKey = ["authLogout"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = () => {
    return authLogout();
  };
  return { mutationFn, ...mutationOptions };
};
const useAuthLogout = (options, queryClient) => {
  const mutationOptions = getAuthLogoutMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const authLogin = (authLoginBody, signal) => {
  return customInstance(
    {
      url: `/auth/login`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: authLoginBody,
      signal
    }
  );
};
const getAuthLoginMutationOptions = (options) => {
  const mutationKey = ["authLogin"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return authLogin(data);
  };
  return { mutationFn, ...mutationOptions };
};
const useAuthLogin = (options, queryClient) => {
  const mutationOptions = getAuthLoginMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const authRegister = (authRegisterBody, signal) => {
  return customInstance(
    {
      url: `/auth/register`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: authRegisterBody,
      signal
    }
  );
};
const getAuthRegisterMutationOptions = (options) => {
  const mutationKey = ["authRegister"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return authRegister(data);
  };
  return { mutationFn, ...mutationOptions };
};
const useAuthRegister = (options, queryClient) => {
  const mutationOptions = getAuthRegisterMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const auth = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  authLogin,
  authLogout,
  authMe,
  authRegister,
  getAuthLoginMutationOptions,
  getAuthLogoutMutationOptions,
  getAuthRegisterMutationOptions,
  useAuthLogin,
  useAuthLogout,
  useAuthRegister
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_TTL_MS = 1e4;
async function getSession(ttlMs = DEFAULT_TTL_MS, cookieHeader) {
  {
    return authMe();
  }
}
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  subscriptionCurrentPeriodEnd: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  trialNotes: z.string().nullable()
});
const AuthContext = createContext(null);
const USER_KEY = "auth:user";
function AuthProvider({ children, initialUser }) {
  const [user, setUser] = useState(() => {
    if (typeof initialUser !== "undefined") {
      return initialUser;
    }
    {
      return null;
    }
  });
  const loginMutation = useAuthLogin();
  const registerMutation = useAuthRegister();
  const logoutMutation = useAuthLogout();
  const signIn = useCallback(async (email, password) => {
    const response = await loginMutation.mutateAsync({ data: { email, password } });
    const nextUser = response.user;
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, [loginMutation]);
  const signUp = useCallback(async (name, email, password) => {
    const response = await registerMutation.mutateAsync({ data: { name, email, password } });
    const nextUser = response.user;
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, [registerMutation]);
  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    logoutMutation.mutate();
  }, [logoutMutation]);
  const refresh = useCallback(async () => {
    const { authMe: authMe2 } = await Promise.resolve().then(() => auth);
    const response = await authMe2();
    const nextUser = response.user;
    const parsed = UserSchema.parse(nextUser);
    setUser(parsed);
    localStorage.setItem(USER_KEY, JSON.stringify(parsed));
  }, []);
  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, signIn, signUp, signOut, refresh }),
    [signIn, signOut, signUp, refresh, user]
  );
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
const primaryNav = [
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings }
];
function Sidebar() {
  var _a2, _b2;
  const { isAuthenticated, user, signOut } = useAuth();
  const routerState = useRouterState();
  const navigate = useNavigate();
  const hideOnAuthScreens = routerState.location.pathname === "/login" || routerState.location.pathname === "/register";
  if (hideOnAuthScreens) {
    return null;
  }
  const navItems = (user == null ? void 0 : user.isAdmin) ? [...primaryNav, { to: "/admin", label: "Admin", icon: ShieldCheck }] : primaryNav;
  const isSettings = routerState.location.pathname === "/settings";
  const searchDetails = routerState.location.search;
  const searchObj = searchDetails && typeof searchDetails === "object" && !Array.isArray(searchDetails) ? searchDetails : void 0;
  const currentTab = (typeof (searchObj == null ? void 0 : searchObj.tab) === "string" ? searchObj.tab : void 0) || new URLSearchParams((_a2 = routerState.location.searchStr) != null ? _a2 : "").get("tab");
  const settingsSubnav = [
    { label: "Integrations", tab: "integrations" },
    { label: "Writing Style", tab: "style" },
    { label: "Scheduling", tab: "scheduling" },
    { label: "Billing", tab: "billing" }
  ];
  return /* @__PURE__ */ jsx("aside", { className: "fixed inset-y-0 left-0 z-30 w-64 border-r bg-white", children: /* @__PURE__ */ jsxs("div", { className: "h-full flex flex-col", children: [
    /* @__PURE__ */ jsx("div", { className: "px-4 py-3 flex items-center gap-2", children: /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded bg-blue-600" }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Content Projects" })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "px-4", children: /* @__PURE__ */ jsx(Button, { asChild: true, className: "w-full", size: "sm", children: /* @__PURE__ */ jsxs(Link, { to: "/projects/new", children: [
      /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
      " New Project"
    ] }) }) }),
    /* @__PURE__ */ jsx(Separator, { className: "my-3" }),
    /* @__PURE__ */ jsx("nav", { className: "px-2 py-1 space-y-1", children: navItems.map((item) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(SidebarLink, { item }),
      item.to === "/settings" && isSettings ? /* @__PURE__ */ jsx("div", { className: "pl-6 pr-2 pb-2", "aria-live": "polite", children: /* @__PURE__ */ jsx("nav", { "aria-label": "Settings sections", className: "ml-0 border-l pl-3 space-y-1", children: settingsSubnav.map((s) => {
        const active = currentTab === s.tab;
        const cls = active ? "block rounded px-2 py-1 text-xs bg-zinc-100 text-zinc-900" : "block rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900";
        return /* @__PURE__ */ jsx(
          Link,
          {
            to: "/settings",
            search: { tab: s.tab },
            "aria-current": active ? "page" : void 0,
            className: cls,
            children: s.label
          },
          s.tab
        );
      }) }) }) : null
    ] }, item.label)) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-auto", children: [
      /* @__PURE__ */ jsx(Separator, { className: "mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm", children: isAuthenticated ? /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: (_b2 = user == null ? void 0 : user.name) != null ? _b2 : "Account" }),
        /* @__PURE__ */ jsx("div", { className: "text-zinc-500 text-xs truncate", children: user == null ? void 0 : user.email }),
        /* @__PURE__ */ jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "mt-2 w-full justify-start",
            onClick: () => {
              signOut();
              navigate({ to: "/login" });
            },
            children: [
              /* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }),
              " Sign out"
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "outline", className: "w-1/2", children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "Login" }) }),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", className: "w-1/2", children: /* @__PURE__ */ jsx(Link, { to: "/register", children: "Register" }) })
      ] }) })
    ] })
  ] }) });
}
function SidebarLink({ item }) {
  const Icon = item.icon;
  const base = "flex items-center gap-2 rounded px-2 py-2 text-sm";
  const active = "bg-zinc-100 text-zinc-900";
  const inactive = item.disabled ? "text-zinc-400 cursor-not-allowed" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900";
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: item.to,
      search: item.search,
      disabled: item.disabled,
      activeProps: { className: cn(base, active) },
      inactiveProps: { className: cn(base, inactive) },
      activeOptions: { includeSearch: true },
      children: [
        /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { children: item.label })
      ]
    }
  );
}
const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      theme,
      className: "toaster group",
      style: {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)"
      },
      ...props
    }
  );
};
const appCss = "/assets/styles-C-_vA-4F.css";
function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
      }
    }
  });
  return {
    queryClient
  };
}
function Provider({
  children,
  queryClient
}) {
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children });
}
const Route$c = createRootRoute({
  head: () => ({
    meta: [{
      charSet: "utf-8"
    }, {
      name: "viewport",
      content: "width=device-width, initial-scale=1"
    }, {
      title: "Content Creation"
    }],
    links: [{
      rel: "stylesheet",
      href: appCss
    }]
  }),
  // SSR: get user so initial HTML matches auth state
  loader: async () => {
    try {
      const {
        user
      } = await authMe();
      return {
        user
      };
    } catch {
      return {
        user: null
      };
    }
  },
  errorComponent: RootErrorBoundary,
  component: RootComponent
});
function RootComponent() {
  const [queryCtx] = useState(() => getContext());
  const {
    user
  } = Route$c.useLoaderData();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthScreen = pathname === "/login" || pathname === "/register";
  const isMarketingScreen = pathname === "/";
  const showAppShell = !(isAuthScreen || isMarketingScreen);
  const showTopBar = location.isLoading || location.isTransitioning;
  return /* @__PURE__ */ jsx(RootDocument, { children: /* @__PURE__ */ jsx(Provider, { ...queryCtx, children: /* @__PURE__ */ jsxs(AuthProvider, { initialUser: user != null ? user : null, children: [
    showAppShell ? /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-zinc-50", children: [
      /* @__PURE__ */ jsx("div", { className: ["fixed top-0 left-0 right-0 h-0.5 z-[1000] bg-zinc-900 transition-opacity", showTopBar ? "opacity-100" : "opacity-0"].join(" ") }),
      /* @__PURE__ */ jsx(Sidebar, {}),
      /* @__PURE__ */ jsx("main", { className: "pl-64 relative min-h-screen", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-6xl", children: /* @__PURE__ */ jsx(Outlet, {}) }) })
    ] }) : /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(TanStackRouterDevtools, { position: "bottom-right" }),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-right" }),
    /* @__PURE__ */ jsx(ReactQueryDevtools, { buttonPosition: "bottom-left" })
  ] }) }) });
}
function RootDocument({
  children
}) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function getErrorMessage(error) {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const candidate = error.message;
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return "Something went wrong";
}
function RootErrorBoundary({
  error
}) {
  const message = getErrorMessage(error);
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center p-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-lg w-full rounded-md border bg-white p-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-lg font-semibold mb-2", children: "An error occurred" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-700 break-words", children: message }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "rounded border px-3 py-1.5 text-sm", onClick: () => window.location.assign("/"), children: "Go Home" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "rounded border px-3 py-1.5 text-sm", onClick: () => window.location.reload(), children: "Reload" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function isApiError(error) {
  return !!error && typeof error === "object" && "status" in error && typeof error.status === "number";
}
function resolveMessage(error) {
  if (isApiError(error)) {
    if (error.status >= 500) {
      return "Our servers took too long to respond. Try again in a moment.";
    }
    if (error.status === 0) {
      return "The request was blocked. Check your connection and try again.";
    }
    return error.error || "The session check did not complete.";
  }
  if (error instanceof Error) {
    return error.message || "The session check did not complete.";
  }
  return "The session check did not complete.";
}
function handleAuthGuardError(error) {
  if (isApiError(error) && (error.status === 401 || error.status === 419)) {
    return true;
  }
  resolveMessage(error);
  {
    console.warn("[auth] Session check failed:", error);
  }
  return false;
}
const linkedInAuth0 = (signal) => {
  return customInstance(
    {
      url: `/auth/linkedin/auth`,
      method: "GET",
      signal
    }
  );
};
const linkedInStatus = (signal) => {
  return customInstance(
    {
      url: `/linkedin/status`,
      method: "GET",
      signal
    }
  );
};
const getLinkedInStatusQueryKey = () => {
  return [`/linkedin/status`];
};
const getLinkedInStatusQueryOptions = (options) => {
  var _a2;
  const { query: queryOptions } = options != null ? options : {};
  const queryKey = (_a2 = queryOptions == null ? void 0 : queryOptions.queryKey) != null ? _a2 : getLinkedInStatusQueryKey();
  const queryFn = ({ signal }) => linkedInStatus(signal);
  return { queryKey, queryFn, ...queryOptions };
};
function useLinkedInStatus(options, queryClient) {
  const queryOptions = getLinkedInStatusQueryOptions(options);
  const query = useQuery(queryOptions, queryClient);
  query.queryKey = queryOptions.queryKey;
  return query;
}
const linkedInDisconnect = (signal) => {
  return customInstance(
    {
      url: `/linkedin/disconnect`,
      method: "POST",
      signal
    }
  );
};
const schedulingGetPreferences = (signal) => {
  return customInstance(
    {
      url: `/scheduling/preferences`,
      method: "GET",
      signal
    }
  );
};
const getSchedulingGetPreferencesQueryKey = () => {
  return [`/scheduling/preferences`];
};
const getSchedulingGetPreferencesQueryOptions = (options) => {
  var _a2;
  const { query: queryOptions } = options != null ? options : {};
  const queryKey = (_a2 = queryOptions == null ? void 0 : queryOptions.queryKey) != null ? _a2 : getSchedulingGetPreferencesQueryKey();
  const queryFn = ({ signal }) => schedulingGetPreferences(signal);
  return { queryKey, queryFn, ...queryOptions };
};
function useSchedulingGetPreferences(options, queryClient) {
  const queryOptions = getSchedulingGetPreferencesQueryOptions(options);
  const query = useQuery(queryOptions, queryClient);
  query.queryKey = queryOptions.queryKey;
  return query;
}
const schedulingUpdatePreferences = (schedulingUpdatePreferencesBody) => {
  return customInstance(
    {
      url: `/scheduling/preferences`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: schedulingUpdatePreferencesBody
    }
  );
};
const getSchedulingUpdatePreferencesMutationOptions = (options) => {
  const mutationKey = ["schedulingUpdatePreferences"];
  const { mutation: mutationOptions } = options ? options.mutation && "mutationKey" in options.mutation && options.mutation.mutationKey ? options : { ...options, mutation: { ...options.mutation, mutationKey } } : { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return schedulingUpdatePreferences(data);
  };
  return { mutationFn, ...mutationOptions };
};
const useSchedulingUpdatePreferences = (options, queryClient) => {
  const mutationOptions = getSchedulingUpdatePreferencesMutationOptions(options);
  return useMutation(mutationOptions, queryClient);
};
const schedulingGetSlots = (signal) => {
  return customInstance(
    {
      url: `/scheduling/slots`,
      method: "GET",
      signal
    }
  );
};
const getSchedulingGetSlotsQueryKey = () => {
  return [`/scheduling/slots`];
};
const getSchedulingGetSlotsQueryOptions = (options) => {
  var _a2;
  const { query: queryOptions } = options != null ? options : {};
  const queryKey = (_a2 = queryOptions == null ? void 0 : queryOptions.queryKey) != null ? _a2 : getSchedulingGetSlotsQueryKey();
  const queryFn = ({ signal }) => schedulingGetSlots(signal);
  return { queryKey, queryFn, ...queryOptions };
};
function useSchedulingGetSlots(options, queryClient) {
  const queryOptions = getSchedulingGetSlotsQueryOptions(options);
  const query = useQuery(queryOptions, queryClient);
  query.queryKey = queryOptions.queryKey;
  return query;
}
const schedulingUpdateSlots = (schedulingUpdateSlotsBody) => {
  return customInstance(
    {
      url: `/scheduling/slots`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: schedulingUpdateSlotsBody
    }
  );
};
const getSchedulingUpdateSlotsMutationOptions = (options) => {
  const mutationKey = ["schedulingUpdateSlots"];
  const { mutation: mutationOptions } = options ? options.mutation && "mutationKey" in options.mutation && options.mutation.mutationKey ? options : { ...options, mutation: { ...options.mutation, mutationKey } } : { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return schedulingUpdateSlots(data);
  };
  return { mutationFn, ...mutationOptions };
};
const useSchedulingUpdateSlots = (options, queryClient) => {
  const mutationOptions = getSchedulingUpdateSlotsMutationOptions(options);
  return useMutation(mutationOptions, queryClient);
};
const settingsGetStyle = (signal) => {
  return customInstance(
    {
      url: `/settings/style`,
      method: "GET",
      signal
    }
  );
};
const settingsPutStyle = (settingsPutStyleBody) => {
  return customInstance(
    {
      url: `/settings/style`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: settingsPutStyleBody
    }
  );
};
const $$splitComponentImporter$b = () => import('./settings-BeOkEna4.mjs');
const Route$b = createFileRoute("/settings")({
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  // Block rendering until required settings data is ready
  loader: async () => {
    const [linkedIn, preferences, slots, styleRes] = await Promise.all([linkedInStatus(), schedulingGetPreferences(), schedulingGetSlots(), settingsGetStyle()]);
    return {
      linkedIn,
      preferences,
      slots,
      style: styleRes.style
    };
  },
  pendingMs: 0,
  pendingComponent: () => /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Settings" }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-600", children: "Loading\u2026" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "h-28 w-full rounded-md border bg-white p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 w-32 bg-zinc-200 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 h-3 w-56 bg-zinc-200 rounded" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "h-80 w-full rounded-md border bg-white p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 w-40 bg-zinc-200 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 h-3 w-full bg-zinc-100 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "mt-2 h-3 w-5/6 bg-zinc-100 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "mt-2 h-3 w-2/3 bg-zinc-100 rounded" })
      ] })
    ] })
  ] }),
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import('./register-F4p2FPax.mjs');
const Route$a = createFileRoute("/register")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
  beforeLoad: async () => {
    try {
      await getSession();
      throw redirect({
        to: "/projects"
      });
    } catch {
    }
  }
});
const $$splitComponentImporter$9 = () => import('./projects-BFsOu0JM.mjs');
const Route$9 = createFileRoute("/projects")({
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import('./login-B3nfmvgF.mjs');
const Route$8 = createFileRoute("/login")({
  beforeLoad: async () => {
    try {
      await getSession();
      throw redirect({
        to: "/projects"
      });
    } catch {
    }
  },
  pendingMs: 0,
  pendingComponent: () => /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-4", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Checking session\u2026" }) }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const postsFrameworks = (signal) => {
  return customInstance(
    {
      url: `/posts/hooks/frameworks`,
      method: "GET",
      signal
    }
  );
};
const getPostsFrameworksQueryKey = () => {
  return [`/posts/hooks/frameworks`];
};
const getPostsFrameworksQueryOptions = (options) => {
  var _a2;
  const { query: queryOptions } = options != null ? options : {};
  const queryKey = (_a2 = queryOptions == null ? void 0 : queryOptions.queryKey) != null ? _a2 : getPostsFrameworksQueryKey();
  const queryFn = ({ signal }) => postsFrameworks(signal);
  return { queryKey, queryFn, ...queryOptions };
};
function usePostsFrameworks(options, queryClient) {
  const queryOptions = getPostsFrameworksQueryOptions(options);
  const query = useQuery(queryOptions, queryClient);
  query.queryKey = queryOptions.queryKey;
  return query;
}
const postsListByProject = (id, params, signal) => {
  return customInstance(
    {
      url: `/posts/projects/${id}/posts`,
      method: "GET",
      params,
      signal
    }
  );
};
const postsListScheduled = (params, signal) => {
  return customInstance(
    {
      url: `/posts/scheduled`,
      method: "GET",
      params,
      signal
    }
  );
};
const postsAnalytics = (params, signal) => {
  return customInstance(
    {
      url: `/posts/analytics`,
      method: "GET",
      params,
      signal
    }
  );
};
const postsUpdate = (id, postsUpdateBody) => {
  return customInstance(
    {
      url: `/posts/${id}`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data: postsUpdateBody
    }
  );
};
const getPostsUpdateMutationOptions = (options) => {
  const mutationKey = ["postsUpdate"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id, data } = props != null ? props : {};
    return postsUpdate(id, data);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsUpdate = (options, queryClient) => {
  const mutationOptions = getPostsUpdateMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsPublishNow = (id, signal) => {
  return customInstance(
    {
      url: `/posts/${id}/publish`,
      method: "POST",
      signal
    }
  );
};
const getPostsPublishNowMutationOptions = (options) => {
  const mutationKey = ["postsPublishNow"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id } = props != null ? props : {};
    return postsPublishNow(id);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsPublishNow = (options, queryClient) => {
  const mutationOptions = getPostsPublishNowMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsSchedule = (id, postsScheduleBody, signal) => {
  return customInstance(
    {
      url: `/posts/${id}/schedule`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: postsScheduleBody,
      signal
    }
  );
};
const getPostsScheduleMutationOptions = (options) => {
  const mutationKey = ["postsSchedule"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id, data } = props != null ? props : {};
    return postsSchedule(id, data);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsSchedule = (options, queryClient) => {
  const mutationOptions = getPostsScheduleMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsUnschedule = (id) => {
  return customInstance(
    {
      url: `/posts/${id}/schedule`,
      method: "DELETE"
    }
  );
};
const getPostsUnscheduleMutationOptions = (options) => {
  const mutationKey = ["postsUnschedule"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id } = props != null ? props : {};
    return postsUnschedule(id);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsUnschedule = (options, queryClient) => {
  const mutationOptions = getPostsUnscheduleMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsAutoSchedule = (id, signal) => {
  return customInstance(
    {
      url: `/posts/${id}/auto-schedule`,
      method: "POST",
      signal
    }
  );
};
const getPostsAutoScheduleMutationOptions = (options) => {
  const mutationKey = ["postsAutoSchedule"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id } = props != null ? props : {};
    return postsAutoSchedule(id);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsAutoSchedule = (options, queryClient) => {
  const mutationOptions = getPostsAutoScheduleMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsAutoScheduleProject = (projectId, postsAutoScheduleProjectBody, signal) => {
  return customInstance(
    {
      url: `/posts/projects/${projectId}/posts/auto-schedule`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: postsAutoScheduleProjectBody,
      signal
    }
  );
};
const getPostsAutoScheduleProjectMutationOptions = (options) => {
  const mutationKey = ["postsAutoScheduleProject"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { projectId, data } = props != null ? props : {};
    return postsAutoScheduleProject(projectId, data);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsAutoScheduleProject = (options, queryClient) => {
  const mutationOptions = getPostsAutoScheduleProjectMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsBulkSetStatus = (postsBulkSetStatusBody) => {
  return customInstance(
    {
      url: `/posts/bulk`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data: postsBulkSetStatusBody
    }
  );
};
const getPostsBulkSetStatusMutationOptions = (options) => {
  const mutationKey = ["postsBulkSetStatus"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return postsBulkSetStatus(data);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsBulkSetStatus = (options, queryClient) => {
  const mutationOptions = getPostsBulkSetStatusMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const postsBulkRegenerate = (postsBulkRegenerateBody, signal) => {
  return customInstance(
    {
      url: `/posts/bulk/regenerate`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: postsBulkRegenerateBody,
      signal
    }
  );
};
const getPostsBulkRegenerateMutationOptions = (options) => {
  const mutationKey = ["postsBulkRegenerate"];
  const { mutation: mutationOptions } = options ? options.mutation && "mutationKey" in options.mutation && options.mutation.mutationKey ? options : { ...options, mutation: { ...options.mutation, mutationKey } } : { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { data } = props != null ? props : {};
    return postsBulkRegenerate(data);
  };
  return { mutationFn, ...mutationOptions };
};
const usePostsBulkRegenerate = (options, queryClient) => {
  const mutationOptions = getPostsBulkRegenerateMutationOptions(options);
  return useMutation(mutationOptions, queryClient);
};
const postsHookWorkbench = (id, postsHookWorkbenchBody, signal) => {
  return customInstance(
    {
      url: `/posts/${id}/hooks/workbench`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: postsHookWorkbenchBody,
      signal
    }
  );
};
const $$splitComponentImporter$7 = () => import('./calendar-BQlyLVMJ.mjs');
const Route$7 = createFileRoute("/calendar")({
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  // Block rendering until scheduled posts are loaded
  loader: async () => postsListScheduled({
    page: 1,
    pageSize: 20
  }),
  pendingMs: 0,
  pendingComponent: () => /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Scheduled Posts" }),
    /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Loading schedule\u2026" })
  ] }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import('./analytics-BdPVj6So.mjs');
const Route$6 = createFileRoute("/analytics")({
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  loader: async () => postsAnalytics(),
  pendingComponent: () => /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-2", children: "Analytics" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-zinc-600", children: "Loading analytics\u2026" })
  ] }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const adminUsage = (params, signal) => {
  return customInstance(
    {
      url: `/admin/usage`,
      method: "GET",
      params,
      signal
    }
  );
};
const adminUpdateTrial = (userId, adminUpdateTrialBody) => {
  return customInstance(
    {
      url: `/admin/users/${userId}/trial`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data: adminUpdateTrialBody
    }
  );
};
const $$splitComponentImporter$5 = () => import('./admin-Cf7sOybP.mjs');
function computeRangeParams(range) {
  const now = /* @__PURE__ */ new Date();
  const from = /* @__PURE__ */ new Date();
  {
    from.setDate(now.getDate() - 30);
  }
  return {
    from: from.toISOString(),
    to: now.toISOString()
  };
}
const Route$5 = createFileRoute("/admin")({
  beforeLoad: async () => {
    try {
      const session = await getSession();
      if (!session.user.isAdmin) {
        throw redirect({
          to: "/projects"
        });
      }
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  loader: async () => {
    const session = await getSession();
    if (!session.user.isAdmin) {
      throw redirect({
        to: "/projects"
      });
    }
    const params = computeRangeParams();
    const initialUsage = await adminUsage(params);
    return {
      initialUsage
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import('./index-BOV8bUEU.mjs');
const Route$4 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component"),
  head: () => ({
    meta: [{
      title: "Content Projects | Fractional executives on LinkedIn, without the grind"
    }, {
      name: "description",
      content: "Content Projects helps fractional executives turn transcripts and briefings into polished LinkedIn posts. Stay visible across every portfolio without rewriting the same story twice."
    }]
  })
});
const projectsCreate = (projectsCreateBody, signal) => {
  return customInstance(
    {
      url: `/projects`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: projectsCreateBody,
      signal
    }
  );
};
const projectsList = (params, signal) => {
  return customInstance(
    {
      url: `/projects`,
      method: "GET",
      params,
      signal
    }
  );
};
const projectsGet = (id, signal) => {
  return customInstance(
    {
      url: `/projects/${id}`,
      method: "GET",
      signal
    }
  );
};
const projectsUpdate = (id, projectsUpdateBody) => {
  return customInstance(
    {
      url: `/projects/${id}`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data: projectsUpdateBody
    }
  );
};
const projectsDelete = (id) => {
  return customInstance(
    {
      url: `/projects/${id}`,
      method: "DELETE"
    }
  );
};
const getProjectsDeleteMutationOptions = (options) => {
  const mutationKey = ["projectsDelete"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id } = props != null ? props : {};
    return projectsDelete(id);
  };
  return { mutationFn, ...mutationOptions };
};
const useProjectsDelete = (options, queryClient) => {
  const mutationOptions = getProjectsDeleteMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const projectsUpdateStage = (id, projectsUpdateStageBody) => {
  return customInstance(
    {
      url: `/projects/${id}/stage`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: projectsUpdateStageBody
    }
  );
};
const projectsProcess = (id, signal) => {
  return customInstance(
    {
      url: `/projects/${id}/process`,
      method: "POST",
      signal
    }
  );
};
const $$splitComponentImporter$3 = () => import('./projects.index-CwFmWmL-.mjs');
const Route$3 = createFileRoute("/projects/")({
  // Load the projects list for the index view
  loader: async () => projectsList({
    page: 1,
    pageSize: 100
  }),
  // Immediately swap to a pending UI during navigation
  pendingMs: 0,
  pendingComponent: () => /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold mb-4", children: "Projects" }),
    /* @__PURE__ */ jsx("div", { className: "text-sm text-zinc-600", children: "Loading projects\u2026" })
  ] }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import('./projects.new-BbjaqVIk.mjs');
const Route$2 = createFileRoute("/projects/new")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
  beforeLoad: async () => {
    try {
      await getSession();
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  }
});
const transcriptsGet = (id, signal) => {
  return customInstance(
    {
      url: `/transcripts/${id}`,
      method: "GET",
      signal
    }
  );
};
const getTranscriptsGetQueryKey = (id) => {
  return [`/transcripts/${id}`];
};
const getTranscriptsGetQueryOptions = (id, options) => {
  var _a2;
  const { query: queryOptions } = options != null ? options : {};
  const queryKey = (_a2 = queryOptions == null ? void 0 : queryOptions.queryKey) != null ? _a2 : getTranscriptsGetQueryKey(id);
  const queryFn = ({ signal }) => transcriptsGet(id, signal);
  return { queryKey, queryFn, enabled: !!id, ...queryOptions };
};
function useTranscriptsGet(id, options, queryClient) {
  const queryOptions = getTranscriptsGetQueryOptions(id, options);
  const query = useQuery(queryOptions, queryClient);
  query.queryKey = queryOptions.queryKey;
  return query;
}
const transcriptsPut = (id, transcriptsPutBody) => {
  return customInstance(
    {
      url: `/transcripts/${id}`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: transcriptsPutBody
    }
  );
};
const getTranscriptsPutMutationOptions = (options) => {
  const mutationKey = ["transcriptsPut"];
  const { mutation: mutationOptions } = { mutation: { mutationKey } };
  const mutationFn = (props) => {
    const { id, data } = props != null ? props : {};
    return transcriptsPut(id, data);
  };
  return { mutationFn, ...mutationOptions };
};
const useTranscriptsPut = (options, queryClient) => {
  const mutationOptions = getTranscriptsPutMutationOptions();
  return useMutation(mutationOptions, queryClient);
};
const $$splitComponentImporter$1 = () => import('./projects._projectId-DrZJzgD3.mjs');
const Route$1 = createFileRoute("/projects/$projectId")({
  beforeLoad: async ({
    params
  }) => {
    try {
      await getSession();
      if (!params.projectId) {
        throw redirect({
          to: "/projects"
        });
      }
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      const shouldRedirect = handleAuthGuardError(error);
      if (shouldRedirect) {
        throw redirect({
          to: "/login"
        });
      }
    }
  },
  // Block rendering until the project and related data are ready
  loader: async ({
    params
  }) => {
    const id = params.projectId;
    const [project, transcript, posts, linkedIn] = await Promise.all([projectsGet(id), transcriptsGet(id), postsListByProject(id, {
      page: 1,
      pageSize: 100
    }), linkedInStatus()]);
    return {
      project,
      transcript,
      posts,
      linkedIn
    };
  },
  pendingMs: 0,
  pendingComponent: () => /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("div", { className: "h-6 w-56 bg-zinc-200 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 w-24 bg-zinc-100 rounded" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "h-8 w-28 bg-zinc-200 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "h-8 w-28 bg-zinc-200 rounded" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-md border bg-white px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 w-40 bg-zinc-200 rounded" }),
        /* @__PURE__ */ jsx("div", { className: "h-3 w-10 bg-zinc-100 rounded" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 h-2 w-full overflow-hidden rounded bg-zinc-100", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-zinc-200", style: {
        width: "33%"
      } }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-2 h-96 w-full rounded-md border bg-white p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-4 w-28 bg-zinc-200 rounded" }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 h-3 w-full bg-zinc-100 rounded" }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 h-3 w-5/6 bg-zinc-100 rounded" }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 h-3 w-2/3 bg-zinc-100 rounded" })
    ] })
  ] }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import('./integrations.linkedin.callback-DEDlw27c.mjs');
const Route = createFileRoute("/integrations/linkedin/callback")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const SettingsRoute = Route$b.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => Route$c
});
const RegisterRoute = Route$a.update({
  id: "/register",
  path: "/register",
  getParentRoute: () => Route$c
});
const ProjectsRoute = Route$9.update({
  id: "/projects",
  path: "/projects",
  getParentRoute: () => Route$c
});
const LoginRoute = Route$8.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$c
});
const CalendarRoute = Route$7.update({
  id: "/calendar",
  path: "/calendar",
  getParentRoute: () => Route$c
});
const AnalyticsRoute = Route$6.update({
  id: "/analytics",
  path: "/analytics",
  getParentRoute: () => Route$c
});
const AdminRoute = Route$5.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => Route$c
});
const IndexRoute = Route$4.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$c
});
const ProjectsIndexRoute = Route$3.update({
  id: "/",
  path: "/",
  getParentRoute: () => ProjectsRoute
});
const ProjectsNewRoute = Route$2.update({
  id: "/new",
  path: "/new",
  getParentRoute: () => ProjectsRoute
});
const ProjectsProjectIdRoute = Route$1.update({
  id: "/$projectId",
  path: "/$projectId",
  getParentRoute: () => ProjectsRoute
});
const IntegrationsLinkedinCallbackRoute = Route.update({
  id: "/integrations/linkedin/callback",
  path: "/integrations/linkedin/callback",
  getParentRoute: () => Route$c
});
const ProjectsRouteChildren = {
  ProjectsProjectIdRoute,
  ProjectsNewRoute,
  ProjectsIndexRoute
};
const ProjectsRouteWithChildren = ProjectsRoute._addFileChildren(
  ProjectsRouteChildren
);
const rootRouteChildren = {
  IndexRoute,
  AdminRoute,
  AnalyticsRoute,
  CalendarRoute,
  LoginRoute,
  ProjectsRoute: ProjectsRouteWithChildren,
  RegisterRoute,
  SettingsRoute,
  IntegrationsLinkedinCallbackRoute
};
const routeTree = Route$c._addFileChildren(rootRouteChildren)._addFileTypes();
function createRouter() {
  const router2 = createRouter$1({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    // Provide a default not-found component to silence warnings
    defaultNotFoundComponent: NotFound
  });
  return router2;
}
function getRouter() {
  return createRouter();
}
function NotFound() {
  return /* @__PURE__ */ jsxs("div", { className: "p-6 text-sm text-zinc-700", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-lg font-semibold mb-2", children: "Not Found" }),
    /* @__PURE__ */ jsx("p", { children: "The requested page could not be found." })
  ] });
}
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createRouter,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));

export { usePostsAutoScheduleProject as A, Button as B, usePostsBulkRegenerate as C, useTranscriptsPut as D, buttonVariants as E, usePostsFrameworks as F, postsHookWorkbench as G, Route$1 as H, projectsProcess as I, projectsUpdate as J, projectsUpdateStage as K, useLinkedInStatus as L, useProjectsDelete as M, router as N, Route$b as R, useSchedulingGetSlots as a, useSchedulingUpdatePreferences as b, cn as c, useSchedulingUpdateSlots as d, customInstance as e, useAuth as f, formatCurrency as g, linkedInAuth0 as h, Route$7 as i, Route$6 as j, Route$5 as k, linkedInDisconnect as l, adminUsage as m, adminUpdateTrial as n, Route$3 as o, projectsCreate as p, postsListByProject as q, useTranscriptsGet as r, settingsPutStyle as s, usePostsUpdate as t, useSchedulingGetPreferences as u, usePostsBulkSetStatus as v, usePostsPublishNow as w, usePostsSchedule as x, usePostsUnschedule as y, usePostsAutoSchedule as z };
//# sourceMappingURL=router-DdLUJ7j2.mjs.map
