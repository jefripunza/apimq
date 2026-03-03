import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useThemeStore } from "@/stores/themeStore";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  Shield,
  FileText,
  Group,
  Key,
} from "lucide-react";
import Loading from "@/components/Loading";
import version from "@/version";

const navItems = [
  {
    label: "Dashboard",
    path: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Queues",
    path: "/app/queues",
    icon: Group,
  },
  {
    label: "Log",
    path: "/app/log",
    icon: FileText,
  },
  {
    label: "Whitelist",
    path: "/app/whitelist",
    icon: Shield,
  },
  {
    label: "Apikey",
    path: "/app/apikey",
    icon: Key,
  },

  // ----------------------- //

  {
    label: "Setting",
    path: "/app/setting",
    icon: Settings,
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, validateToken, logout } = useAuthStore();
  const {
    isCollapsed,
    isMobileOpen,
    toggleCollapse,
    setCollapsed,
    setMobileOpen,
  } = useSidebarStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const valid = await validateToken("app");
      if (!valid) {
        navigate("/", { replace: true });
      }
    };
    checkAuth();
  }, [validateToken, navigate]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // lg
    const apply = () => {
      const nextIsDesktop = mq.matches;
      setIsDesktop(nextIsDesktop);
      if (!nextIsDesktop) {
        setCollapsed(false);
      }
    };

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [setCollapsed]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const effectiveCollapsed = isDesktop ? isCollapsed : false;
  const sidebarWidth = effectiveCollapsed ? "w-[72px]" : "w-65";

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="h-screen overflow-hidden bg-dark-900 flex">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 bg-dark-800 border-r border-dark-600/50 flex flex-col transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isMobileOpen ? "translate-x-0 w-65" : "-translate-x-full lg:translate-x-0"}
          ${!isMobileOpen ? sidebarWidth : ""}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-dark-600/50 shrink-0">
          <div className="flex items-center w-full min-w-0">
            {/* Logo - hidden when collapsed */}
            {(!effectiveCollapsed || isMobileOpen) && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center overflow-hidden">
                    <img src="/apimq.svg" alt="ApiMQ" className="w-5 h-5" />
                  </div>
                  {/* <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full animate-pulse-glow" /> */}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-foreground tracking-tight truncate">
                    ApiMQ
                  </h1>
                  <p className="text-[10px] text-dark-400 font-mono truncate">
                    {version}
                  </p>
                </div>
              </div>
            )}

            {/* Desktop collapse hamburger (RIGHT side) */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex text-dark-300 hover:text-foreground transition-colors shrink-0 ml-auto"
              title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto lg:hidden text-dark-300 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-accent-500/15 text-accent-400 border border-accent-500/20"
                      : "text-dark-300 hover:text-foreground hover:bg-dark-700/50 border border-transparent"
                  }
                  ${effectiveCollapsed && !isMobileOpen ? "justify-center" : ""}
                `}
                title={effectiveCollapsed ? item.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {(!effectiveCollapsed || isMobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-dark-600/50 p-3 space-y-2 shrink-0">
          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-300 hover:text-neon-red hover:bg-neon-red/5 transition-all ${effectiveCollapsed && !isMobileOpen ? "justify-center" : ""}`}
            title="Sign out"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {(!effectiveCollapsed || isMobileOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-800/60 backdrop-blur-md border-b border-dark-600/50 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-dark-300 hover:text-foreground transition-colors mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title from route */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="text-sm font-mono text-dark-300">
              {location.pathname.replace("/app/", "")}
            </span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-dark-300 hover:text-foreground hover:bg-dark-700/50 transition-all"
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                window.open("/doc", "_blank", "noopener,noreferrer")
              }
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-700/50 rounded-lg border border-dark-600/30 text-xs font-mono text-dark-300 hover:text-foreground hover:bg-dark-700/70 transition-all"
              title="Open Docs"
            >
              Docs
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
