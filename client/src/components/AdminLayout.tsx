import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3, Bell, ChevronLeft, ChevronRight, Gift, LayoutDashboard,
  LogOut, Medal, ScrollText, Settings, Shield, ShoppingBag, Target,
  Trophy, Users, Zap, Network, FileText
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { getInitials } from "@shared/const";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Target, label: "Tasks & Offers", path: "/admin/tasks" },
  { icon: Gift, label: "Rewards Shop", path: "/admin/rewards" },
  { icon: Medal, label: "Achievements", path: "/admin/achievements" },
  { icon: ShoppingBag, label: "Redemptions", path: "/admin/redemptions" },
  { icon: Zap, label: "Offer Providers", path: "/admin/providers" },
  { icon: Network, label: "Affiliate Networks", path: "/admin/networks" },
  { icon: FileText, label: "Postback Audit Logs", path: "/admin/postback-audit-logs" },
  { icon: Bell, label: "Broadcast", path: "/admin/broadcast" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
  { icon: ScrollText, label: "Audit Log", path: "/admin/audit-log" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Shield className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">You don't have permission to access the admin panel.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-background border-r border-border transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-black" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-sm leading-none">OptimEarn</div>
              <div className="text-primary text-xs font-medium">Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group mb-0.5",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-secondary"
                )}>
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-16 bg-card text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-50 shadow-lg border border-border">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-3 space-y-1">
          <Link href="/dashboard">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-secondary cursor-pointer transition-all",
              collapsed && "justify-center"
            )}>
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm">User Dashboard</span>}
            </div>
          </Link>
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">{title}</h1>
              {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-black text-xs font-bold">
                {getInitials(user?.name)}
              </div>
              <span className="text-white text-sm font-medium">{user?.name ?? 'Admin'}</span>
              <span className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded font-medium">ADMIN</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
