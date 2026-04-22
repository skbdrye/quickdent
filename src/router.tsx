import { lazy, Suspense } from 'react';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded heavy authenticated pages keep the initial bundle small.
const UserDashboardPage = lazy(() => import("./pages/UserDashboardPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const lazied = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<PageFallback />}><Component /></Suspense>
);

export const routers = [
  {
    path: "/",
    name: 'home',
    element: <Index />,
  },
  {
    path: "/dashboard",
    name: 'user-dashboard',
    element: lazied(UserDashboardPage),
  },
  {
    path: "/admin",
    name: 'admin-dashboard',
    element: lazied(AdminDashboardPage),
  },
  {
    path: "/terms",
    name: 'terms',
    element: lazied(TermsPage),
  },
  {
    path: "/privacy",
    name: 'privacy',
    element: lazied(PrivacyPage),
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: '404',
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
