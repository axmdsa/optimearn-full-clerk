import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import {
  TrendingUp, Zap, Trophy, CheckCircle2, Star,
  ArrowRight, Gift, Crosshair, ShoppingBag, Clock, Users, ChevronRight,
  Flame, Apple, Smartphone, Monitor
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { PendingPointsCard } from "@/components/PendingPointsCard";

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground mb-0.5">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-primary mt-1">{sub}</p>}
    </div>
  );
}

function QuickActionCard({ icon, label, desc, path, color }: {
  icon: React.ReactNode; label: string; desc: string; path: string; color: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(path)}
      className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:bg-card/80 transition-all duration-150 group"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", color)}>
        {icon}
      </div>
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.user.getStats.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery({ category: 'all', country: user?.country ?? undefined });
  const { data: notifications } = trpc.notifications.list.useQuery();
  const { data: canClaim } = trpc.dailyBonus.canClaim.useQuery();
  const { data: pendingPoints } = trpc.rewards.getPendingPoints.useQuery();
  const topEarningTasks = tasks ? (() => {
    const seen = new Set();
    const unique = [];
    for (const task of tasks) {
      if (!seen.has(task.id)) {
        seen.add(task.id);
        unique.push(task);
      }
    }
    return unique.sort((a: any, b: any) => b.points - a.points).slice(0, 4);
  })() : [];

  const recentActivity = notifications?.slice(0, 5) ?? [];
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const xpPercent = stats ? Math.round((stats.xp / stats.xpToNextLevel) * 100) : 0;

  const typeIcons: Record<string, React.ReactNode> = {
    task_complete: <Zap className="w-3.5 h-3.5 text-primary" />,
    reward_redeemed: <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />,
    achievement: <Trophy className="w-3.5 h-3.5 text-yellow-400" />,
    bonus: <Gift className="w-3.5 h-3.5 text-orange-400" />,
    system: <Star className="w-3.5 h-3.5 text-muted-foreground" />,
    referral: <Users className="w-3.5 h-3.5 text-purple-400" />,
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Task Detail Modal */}
        {selectedTask && (
          <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="space-y-4">
                <h2 className="font-bold text-xl">{selectedTask.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-primary">+{selectedTask.points.toLocaleString()} pts</span>
                  <span className="text-xs text-muted-foreground">{selectedTask.category}</span>
                </div>
                <Button className="w-full" onClick={() => { setSelectedTask(null); setLocation('/missions'); }}>View Full Details</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* ─── Welcome Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">
              Welcome back, <span className="text-primary">{stats?.name?.split(' ')[0] ?? 'User'}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your account today.</p>
          </div>
          {canClaim?.canClaim && (
            <Button
              onClick={() => setLocation('/daily-bonus')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green-sm font-semibold shrink-0 animate-pulse-glow"
            >
              <Gift className="w-4 h-4 mr-2" />
              Claim Daily Bonus!
            </Button>
          )}
        </div>

        {/* ─── Level Progress Banner ───────────────────────── */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5 mb-8 card-glow-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-display font-black text-xl">
                {stats?.level ?? 1}
              </div>
              <div>
                <p className="font-display font-bold text-lg">Level {stats?.level ?? 1}</p>
                <p className="text-sm text-muted-foreground">{stats?.xp ?? 0} / {stats?.xpToNextLevel ?? 500} XP to next level</p>
              </div>
            </div>
            <div className="flex-1">
              <Progress value={xpPercent} className="h-3 bg-secondary" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(stats?.streak ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-400">{stats?.streak}d streak</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{(stats?.points ?? 0).toLocaleString()} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Stats Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Star className="w-5 h-5 text-primary" />}
            label="Total Points"
            value={(stats?.points ?? 0).toLocaleString()}
            sub="Available to redeem"
            color="bg-primary/15"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-green-400" />}
            label="Total Earned"
            value={(stats?.totalEarned ?? 0).toLocaleString()}
            sub="All time points"
            color="bg-green-400/15"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-blue-400" />}
            label="Tasks Done"
            value={String(stats?.completedTasks ?? 0)}
            sub="Completed offers"
            color="bg-blue-400/15"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-yellow-400" />}
            label="Global Rank"
            value={stats?.rank ? `#${stats.rank}` : '#—'}
            sub="Leaderboard position"
            color="bg-yellow-400/15"
          />
          {pendingPoints && pendingPoints.totalPending > 0 && (
            <StatCard
              icon={<Clock className="w-5 h-5 text-yellow-500" />}
              label="Pending Points"
              value={pendingPoints.totalPending.toLocaleString()}
              sub={`${pendingPoints.lockedPending} locked`}
              color="bg-yellow-500/15"
            />
          )}
        </div>

        {/* ─── Quick Actions ───────────────────────────────── */}
        <div className="mb-8">
          <h2 className="font-display font-bold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickActionCard icon={<Crosshair className="w-5 h-5 text-primary" />} label="Earn" desc="Complete tasks & earn" path="/missions" color="bg-primary/15" />
            <QuickActionCard icon={<Gift className="w-5 h-5 text-orange-400" />} label="Daily Bonus" desc="Spin the wheel" path="/daily-bonus" color="bg-orange-400/15" />
            <QuickActionCard icon={<ShoppingBag className="w-5 h-5 text-blue-400" />} label="Cashout" desc="Redeem your points" path="/rewards" color="bg-blue-400/15" />
            <QuickActionCard icon={<Users className="w-5 h-5 text-purple-400" />} label="Referrals" desc="Invite & earn more" path="/referrals" color="bg-purple-400/15" />
          </div>
        </div>

        {/* ─── Pending Points Card ─────────────────────────── */}
        {pendingPoints && pendingPoints.totalPending > 0 && (
          <div className="mb-8">
            <PendingPointsCard
              pendingPoints={pendingPoints.totalPending}
              confirmedPoints={stats?.points ?? 0}
              estimatedVerificationHours={24}
            />
          </div>
        )}

        {/* ─── Featured Tasks + Activity ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured Tasks */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">🏆 Top Earning Offers</h2>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/missions')} className="text-primary hover:text-primary/80 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
              {topEarningTasks.map((task: any, idx: number) => {
                const screenshots = task.screenshots ? JSON.parse(typeof task.screenshots === 'string' ? task.screenshots : JSON.stringify(task.screenshots)) : [];
                const bgImage = screenshots[0] ?? null;
                const catEmoji: Record<string, string> = {
                  survey: '📊', app_trial: '📱', offer: '🎯', video: '🎬', daily: '⚡', social: '👥'
                };
                const gradient = 'from-purple-900/80 via-purple-900/40 to-transparent';
                const accent = 'text-purple-400 border-purple-400/40 bg-purple-400/10';
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-purple-500/75 transition-all duration-200 hover:border-purple-400 glow-purple-dark-neon"
                    style={{ minHeight: 200 }}
                  >
                    {/* Background image */}
                    {bgImage ? (
                      <img
                        src={bgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/60 to-background" />
                    )}

                    {/* Dark overlay */}
                    <div className={cn("absolute inset-0 bg-gradient-to-t", gradient)} />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 p-5 flex flex-col justify-between h-full" style={{ minHeight: 200 }}>
                      {/* Top row: badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Flame badge only */}
                          <span className="flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <Flame className="w-4 h-4" />
                          </span>
                          {/* Category badge */}
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border capitalize", accent)}>
                            {task.category.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Device icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {(() => {
                            try {
                              const devices = typeof task.targetDevices === 'string' ? JSON.parse(task.targetDevices) : task.targetDevices;
                              if (!devices || !Array.isArray(devices) || devices.length === 0) return null;
                              return devices.map((device: string) => {
                                if (device === 'iOS') return <Apple key={device} className="w-4 h-4 text-white/70" />;
                                if (device === 'Android') return <Smartphone key={device} className="w-4 h-4 text-white/70" />;
                                if (device === 'PC') return <Monitor key={device} className="w-4 h-4 text-white/70" />;
                                return null;
                              });
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      </div>

                      {/* Bottom row: icon + info (no CTA button) */}
                      <div className="flex items-end gap-4 mt-6">
                        {/* Icon/Thumbnail */}
                        <div className="shrink-0">
                          {task.imageUrl ? (
                            <img
                              src={task.imageUrl}
                              alt={task.title}
                              className="w-16 h-16 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-4xl shadow-2xl ring-2 ring-white/10">
                              {catEmoji[task.category] ?? '🎁'}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg mb-2">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-black text-lg drop-shadow-lg">
                              +{task.points.toLocaleString()} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="font-display font-bold text-lg mb-4">Recent Activity</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Zap className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Complete your first task to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentActivity.map((n: any) => (
                    <div key={n.id} className="flex items-start gap-3 p-4">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        {typeIcons[n.type] ?? <Star className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
