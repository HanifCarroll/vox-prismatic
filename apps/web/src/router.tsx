import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';

// Lazy load pages for better code splitting
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('./pages/dashboard'));
const ContentPage = lazy(() => import('./pages/content'));
const SchedulerPage = lazy(() => import('./pages/scheduler'));
const PromptsPage = lazy(() => import('./pages/prompts'));

// Loading component for suspense fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

// Create the router with all routes
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'content',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ContentPage />
          </Suspense>
        ),
      },
      {
        path: 'scheduler',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SchedulerPage />
          </Suspense>
        ),
      },
      {
        path: 'prompts',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PromptsPage />
          </Suspense>
        ),
      },
    ],
  },
]);

// Root component that provides the router
export function Router() {
  return <RouterProvider router={router} />;
}