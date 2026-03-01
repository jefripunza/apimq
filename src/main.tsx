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
import QueuePage from "@/pages/app/QueuePage";
import QueueSetupPage from "@/pages/app/QueueSetupPage";
import LogPage from "@/pages/app/LogPage";
import WhitelistPage from "@/pages/app/WhitelistPage";
import ApiKeyPage from "@/pages/app/ApiKeyPage";
import SettingsPage from "@/pages/app/SettingPage";
import DocPage from "@/pages/DocPage";

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
            path: "queues",
            element: <QueuePage />,
          },
          {
            path: "queue/:id/setup",
            element: <QueueSetupPage />,
          },
          {
            path: "log",
            element: <LogPage />,
          },
          {
            path: "whitelist",
            element: <WhitelistPage />,
          },
          {
            path: "apikey",
            element: <ApiKeyPage />,
          },
          {
            path: "setting",
            element: <SettingsPage />,
          },
        ],
      },
    ],
    errorElement: <ErrorBoundaryPage />,
  },
  {
    path: "doc",
    element: <DocPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
