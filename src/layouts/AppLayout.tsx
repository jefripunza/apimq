import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  LayoutDashboard,
  ScrollText,
  Zap,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  User,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    path: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Rules",
    path: "/app/rules",
    icon: ScrollText,
  },
];

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isCollapsed, isMobileOpen, toggleCollapse, setMobileOpen } =
    useSidebarStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarWidth = isCollapsed ? "w-[72px]" : "w-[260px]";

  return (
    <div className="min-h-screen bg-dark-900 flex">
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
          fixed top-0 left-0 h-full z-50 bg-dark-800 border-r border-dark-600/50 flex flex-col transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isMobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0"}
          ${!isMobileOpen ? sidebarWidth : ""}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-dark-600/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full animate-pulse-glow" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white tracking-tight truncate">
                  ApiMQ
                </h1>
                <p className="text-[10px] text-dark-400 font-mono truncate">
                  v0.1.0
                </p>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-dark-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                      : "text-dark-300 hover:text-white hover:bg-dark-700/50 border border-transparent"
                  }
                  ${isCollapsed && !isMobileOpen ? "justify-center" : ""}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-dark-600/50 p-3 space-y-2 shrink-0">
          {/* User info */}
          {(!isCollapsed || isMobileOpen) && user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-700/30">
              <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.username}
                </p>
                <p className="text-[10px] text-dark-400 font-mono">
                  {user.role}
                </p>
              </div>
            </div>
          )}

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-all"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="w-[18px] h-[18px] shrink-0 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-300 hover:text-neon-red hover:bg-neon-red/5 transition-all ${isCollapsed && !isMobileOpen ? "justify-center" : ""}`}
            title="Sign out"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-800/60 backdrop-blur-md border-b border-dark-600/50 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-dark-300 hover:text-white transition-colors mr-4"
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-700/50 rounded-lg border border-dark-600/30">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
              <span className="text-xs font-mono text-dark-300">
                connected
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

