import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import "@/index.css";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import AppLayout from "@/layouts/AppLayout";

// Pages
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/app/DashboardPage";
import RulesPage from "@/pages/app/RulesPage";

// Errors
import ErrorBoundaryPage from "@/pages/error/ErrorBoundaryPage";
import NotFoundPage from "@/pages/error/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
        ],
      },
      {
        path: "app",
        element: <AppLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "rules",
            element: <RulesPage />,
          },
        ],
      },
    ],
    errorElement: <ErrorBoundaryPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
