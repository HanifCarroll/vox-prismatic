import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
    Outlet,
    RouterProvider,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import TableDemo from "./routes/demo.table.tsx";
import TanStackQueryDemo from "./routes/demo.tanstack-query.tsx";
import LoginRoute from "./routes/login.tsx";
import RegisterRoute from "./routes/register.tsx";
import ProjectsRoute from "./routes/projects.tsx";
import AuthenticatedLayoutRoute from "./routes/_authenticated.tsx";
import CalendarRoute from "./routes/calendar.tsx";
import SettingsRoute from "./routes/settings.tsx";
import NewProjectRoute from "./routes/projects.new.tsx";

import Sidebar from "./components/Sidebar";

import * as TanStackQueryProvider from "./integrations/tanstack-query/root-provider.tsx";

import "./styles.css";
import reportWebVitals from "./reportWebVitals.ts";

import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Toaster } from "./components/ui/sonner";

const rootRoute = createRootRoute({
    component: () => (
        <div className="min-h-screen bg-zinc-50">
            <Sidebar />
            <main className="pl-64">
                <Outlet />
            </main>
            <TanStackRouterDevtools position="bottom-right" />
            <Toaster richColors position="top-right" />
        </div>
    ),
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: App,
});

// Pathless authenticated layout wraps protected routes
const authenticatedLayout = AuthenticatedLayoutRoute(rootRoute);

const routeTree = rootRoute.addChildren([
    indexRoute,
    TableDemo(rootRoute),
    TanStackQueryDemo(rootRoute),
    LoginRoute(rootRoute),
    RegisterRoute(rootRoute),
    authenticatedLayout.addChildren([
        ProjectsRoute(authenticatedLayout),
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
