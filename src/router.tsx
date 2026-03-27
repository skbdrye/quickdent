import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserDashboardPage from "./pages/UserDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";

export const routers = [
  {
    path: "/",
    name: 'home',
    element: <Index />,
  },
  {
    path: "/dashboard",
    name: 'user-dashboard',
    element: <UserDashboardPage />,
  },
  {
    path: "/admin",
    name: 'admin-dashboard',
    element: <AdminDashboardPage />,
  },
  {
    path: "/terms",
    name: 'terms',
    element: <TermsPage />,
  },
  {
    path: "/privacy",
    name: 'privacy',
    element: <PrivacyPage />,
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
