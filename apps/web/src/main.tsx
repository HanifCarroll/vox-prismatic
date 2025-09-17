import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
    Outlet,
    RouterProvider,
    createRootRoute,
    createRoute,
    createRouter,
    redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import LoginRoute from "./routes/login.tsx";
import RegisterRoute from "./routes/register.tsx";
import ProjectsRoute from "./routes/projects.tsx";
import AuthenticatedLayoutRoute from "./routes/_authenticated.tsx";
import CalendarRoute from "./routes/calendar.tsx";
import SettingsRoute from "./routes/settings.tsx";
import NewProjectRoute from "./routes/projects.new.tsx";
import ProjectDetailRoute from "./routes/project.detail.tsx";
import LinkedInCallbackRoute from "./routes/integrations.linkedin.callback.tsx";

import Sidebar from "./components/Sidebar";

import * as TanStackQueryProvider from "./integrations/tanstack-query/root-provider.tsx";

import "./styles.css";
import reportWebVitals from "./reportWebVitals.ts";

import { AuthProvider } from "./auth/AuthContext.tsx";
import { Toaster } from "./components/ui/sonner";
import GlobalLoading from "./components/GlobalLoading";

const rootRoute = createRootRoute({
    component: () => (
        <div className="min-h-screen bg-zinc-50">
            <Sidebar />
            <main className="pl-64 relative min-h-screen">
                <Outlet />
                <GlobalLoading message="Loading…" enterDelay={0} exitMs={500} />
            </main>
            <TanStackRouterDevtools position="bottom-right" />
            <Toaster richColors position="top-right" />
        </div>
    ),
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
        const token = localStorage.getItem("auth:token");
        if (token) {
            throw redirect({ to: "/projects" });
        }
        throw redirect({ to: "/login" });
    },
});

// Pathless authenticated layout wraps protected routes
const authenticatedLayout = AuthenticatedLayoutRoute(rootRoute);

const routeTree = rootRoute.addChildren([
    indexRoute,
    LoginRoute(rootRoute),
    RegisterRoute(rootRoute),
    // OAuth callback should be accessible regardless of auth state
    LinkedInCallbackRoute(rootRoute),
    authenticatedLayout.addChildren([
        ProjectsRoute(authenticatedLayout),
        ProjectDetailRoute(authenticatedLayout),
        NewProjectRoute(authenticatedLayout),
        SettingsRoute(authenticatedLayout),
        CalendarRoute(authenticatedLayout),
    ]),
]);

const TanStackQueryProviderContext = TanStackQueryProvider.getContext();
const router = createRouter({
    routeTree,
    context: {
        ...TanStackQueryProviderContext,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </TanStackQueryProvider.Provider>
        </StrictMode>,
    );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
