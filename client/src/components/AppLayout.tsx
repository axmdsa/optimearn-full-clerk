import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { getInitials } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, Crosshair, Layers, ShoppingBag, Gift,
  Trophy, Users, Award, BookOpen, User, Settings,
  Home, LogOut, ChevronLeft, ChevronRight, Bell, Flame,
  Star, Zap, Menu, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import NotificationsPanel from "./NotificationsPanel";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Crosshair, label: "Earn", path: "/missions" },
  { icon: Layers, label: "Offer Walls", path: "/offer-walls" },
  { icon: ShoppingBag, label: "Cashout", path: "/rewards" },
  { icon: Gift, label: "Daily Bonus", path: "/daily-bonus" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Users, label: "Referrals", path: "/referrals" },
  { icon: Award, label: "Achievements", path: "/achievements" },
  { icon: BookOpen, label: "Points Ledger", path: "/ledger" },
  { icon: User, label: "Profile", path: "/profile" },
];

const bottomItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: LogOut, label: "Logout", path: "__logout__" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: profile } = trpc.user.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30000 });

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/');
  }, [loading, isAuthenticated]);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const displayUser = profile ?? user;
  const xpPercent = displayUser ? Math.round((displayUser.xp / displayUser.xpToNextLevel) * 100) : 0;

  const handleNav = (path: string) => {
    if (path === '__logout__') { logout(); return; }
    setLocation(path);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      {/* Logo with Gradient Background */}
      <div className={cn("flex items-center h-16 px-4 border-b border-primary/20 shrink-0 bg-gradient-to-r from-primary/10 to-transparent", collapsed ? "justify-center" : "gap-3")}>
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg text-white">
            Optim<span className="text-primary">Earn</span>
          </span>
        )}
      </div>

      {/* User Card with Gradient */}
      {!collapsed && (
        <div className="mx-3 mt-4 p-4 rounded-xl backdrop-blur-xl border border-green-500/30 shrink-0 transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20" style={{background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.1)', animation: 'glass-shine 4s ease-in-out infinite'}}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 ring-2 ring-primary/50 shadow-lg shadow-primary/30">
              {getInitials(displayUser?.name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{displayUser?.name ?? 'User'}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">LVL {displayUser?.level ?? 1}</span>
                {(displayUser?.streak ?? 0) > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-orange-400">{displayUser?.streak}d</span>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-xs text-yellow-400 font-semibold">{(displayUser?.points ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{displayUser?.xp ?? 0} XP</span>
              <span>{displayUser?.xpToNextLevel ?? 500} XP</span>
            </div>
            <Progress value={xpPercent} className="h-1.5 bg-secondary/40" />
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center mt-4 shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {getInitials(displayUser?.name)}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-1">
          {navItems.map((item, idx) => {
            const active = location === item.path || (item.path !== '/dashboard' && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  animation: mobileOpen ? `slideInFromLeft 0.3s ease-out ${idx * 30}ms backwards` : 'none',
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  collapsed ? "justify-center" : "",
                  active
                    ? "bg-gradient-to-r from-primary/30 to-primary/10 text-primary border border-primary/40 shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border hover:border-primary/20"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Items */}
      <div className="px-2 pb-4 space-y-1 border-t border-primary/20 pt-3 shrink-0 bg-gradient-to-t from-primary/5 to-transparent">
        {user?.role === 'admin' && (
          <button
            onClick={() => handleNav('/admin')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-primary hover:bg-primary/10",
              collapsed ? "justify-center" : ""
            )}
            title={collapsed ? 'Admin Panel' : undefined}
          >
            <Settings className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!collapsed && <span>Admin Panel</span>}
          </button>
        )}
        {bottomItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              collapsed ? "justify-center" : ""
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ─── Desktop Sidebar ──────────────────────────────── */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0 relative",
        collapsed ? "w-16" : "w-56"
      )}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10 shadow-md"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ─── Mobile Sidebar Overlay ───────────────────────── */}
      <div className={cn(
        "lg:hidden fixed inset-0 z-30 flex transition-all duration-500 ease-in-out",
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "absolute inset-0 bg-black backdrop-blur-sm transition-all duration-500 ease-in-out",
          mobileOpen ? "bg-black/60" : "bg-black/0"
        )} onClick={() => setMobileOpen(false)} />
        <aside className={cn(
          "relative w-64 bg-sidebar border-r border-sidebar-border h-full z-40 transition-all duration-500 ease-in-out shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <SidebarContent />
        </aside>
      </div>

      {/* ─── Main Content ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className={cn("h-16 lg:h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-3 lg:px-4 shrink-0 sticky top-0 z-50 transition-all duration-500 ease-in-out lg:translate-y-0", mobileOpen ? "-translate-y-full" : "translate-y-0")}>
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/60"
              onClick={() => setLocation('/profile')}
              title="Profile"
            >
              {displayUser?.avatarUrl ? (
                <img
                  src={displayUser.avatarUrl}
                  alt={displayUser.name ?? 'User'}
                  className="w-7 h-7 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {getInitials(displayUser?.name)}
                </div>
              )}
            </button>
          </div>

          {/* Points display (desktop only) */}
          <div className="hidden sm:flex items-center gap-2 mr-4 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Star className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-bold text-primary">{(displayUser?.points ?? 0).toLocaleString()} pts</span>
          </div>

          {/* Mobile: Daily Streak and Points */}
          <div className="flex lg:hidden items-center gap-2 flex-1 justify-center">
            {(displayUser?.streak ?? 0) > 0 && (
              <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 rounded-full px-2 py-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-400">{displayUser?.streak}d</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-full px-2 py-1">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">{(displayUser?.points ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/60"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationsPanel
                notifications={notifications ?? []}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto scrollbar-thin pb-80 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-around h-16">
            <button
              onClick={() => setLocation('/dashboard')}
              className={cn("flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors", location === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setLocation('/missions')}
              className={cn("flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors", location === '/missions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Earn"
            >
              <Crosshair className="w-5 h-5" />
              <span className="text-xs font-medium">Earn</span>
            </button>
            <button
              onClick={() => setLocation('/rewards')}
              className={cn("flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors", location === '/rewards' ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Cashout"
            >
              <Gift className="w-5 h-5" />
              <span className="text-xs font-medium">Cashout</span>
            </button>
            <button
              onClick={() => setLocation('/ledger')}
              className={cn("flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors", location === '/ledger' ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="History"
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-medium">History</span>
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className={cn("flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors", mobileOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Menu"
            >
              <Menu className="w-6 h-6" />
              <span className="text-xs font-medium">Menu</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
