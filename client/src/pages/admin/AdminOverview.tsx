import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  Activity, AlertCircle, BarChart3, CheckCircle2, Clock,
  Coins, Gift, Target, TrendingUp, Users, Zap, BarChart2, Zap as ZapIcon, Network
} from "lucide-react";
import { Link } from "wouter";

function StatCard({ icon: Icon, label, value, sub, color = "green", trend }: {
  icon: any; label: string; value: string | number; sub?: string;
  color?: "green" | "blue" | "yellow" | "purple" | "red"; trend?: string;
}) {
  const colors = {
    green: "from-primary/20 to-[#00ff87]/5 border-primary/20 text-primary",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/20 text-red-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5" />
        {trend && <span className="text-xs text-gray-400 bg-secondary px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const { data: analytics, isLoading } = trpc.admin.analytics.useQuery();
  const { data: locationAlerts } = trpc.admin.users.getLocationChangeAlerts.useQuery();

  return (
    <AdminLayout title="Overview" subtitle="Platform-wide analytics and quick stats">
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={analytics.totalUsers} sub={`+${analytics.newUsersThisWeek} this week`} color="green" trend={`+${analytics.newUsersThisWeek} wk`} />
            <StatCard icon={Target} label="Total Tasks" value={analytics.totalTasks} color="blue" />
            <StatCard icon={CheckCircle2} label="Completions" value={analytics.totalCompletions} sub={`+${analytics.completionsThisWeek} this week`} color="purple" trend={`+${analytics.completionsThisWeek} wk`} />
            <StatCard icon={Gift} label="Redemptions" value={analytics.totalRedemptions} color="yellow" />
            <StatCard icon={Clock} label="Pending Payouts" value={analytics.pendingRedemptions} color="red" sub="Needs attention" />
            <StatCard icon={Coins} label="Points Issued" value={analytics.totalPointsIssued.toLocaleString()} color="green" />
            <StatCard icon={TrendingUp} label="Points Spent" value={analytics.totalPointsSpent.toLocaleString()} color="blue" />
            <StatCard icon={Zap} label="Active Rate" value={`${analytics.totalUsers > 0 ? Math.round((analytics.completionsThisWeek / analytics.totalUsers) * 100) : 0}%`} color="purple" sub="completions/users this week" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Manage Tasks", path: "/admin/tasks", icon: Target, color: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" },
              { label: "Bulk Import", path: "/admin/bulk-import", icon: TrendingUp, color: "bg-green-500/10 border-green-500/20 hover:bg-green-500/20" },
              { label: "Manage Users", path: "/admin/users", icon: Users, color: "bg-primary/10 border-primary/20 hover:bg-primary/20" },
              { label: "Pending Payouts", path: "/admin/redemptions", icon: Gift, color: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20" },
              { label: "Platform Settings", path: "/admin/settings", icon: BarChart3, color: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20" },
              { label: "Offer Tracking", path: "/admin/tracking", icon: BarChart2, color: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
              { label: "Webhook Simulator", path: "/admin/webhook-simulator", icon: Zap, color: "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20" },
              { label: "Postback Monitoring", path: "/admin/postback-monitoring", icon: Activity, color: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20" },
              { label: "Earnings Dashboard", path: "/admin/earnings", icon: TrendingUp, color: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "Fraud Management", path: "/admin/fraud", icon: AlertCircle, color: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20" },
              { label: "Affiliate Networks", path: "/admin/networks", icon: Network, color: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20" },
            ].map(action => (
              <Link key={action.path} href={action.path}>
                <div className={`border rounded-xl p-4 cursor-pointer transition-all ${action.color} flex items-center gap-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                  <span className="text-white text-sm font-medium">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Top Tasks & Top Earners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Tasks */}
            <div className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-white font-semibold">Top Performing Tasks</h3>
              </div>
              <div className="space-y-3">
                {analytics.topTasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No completions yet</p>
                ) : analytics.topTasks.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs text-gray-400 font-bold">{i + 1}</span>
                      <div>
                        <div className="text-white text-sm font-medium">{item.task?.title ?? 'Unknown'}</div>
                        <div className="text-gray-500 text-xs capitalize">{item.task?.category}</div>
                      </div>
                    </div>
                    <div className="text-primary text-sm font-bold">{Number(item.completions).toLocaleString()} <span className="text-gray-500 font-normal">completions</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Earners */}
            <div className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <h3 className="text-white font-semibold">Top Earners</h3>
              </div>
              <div className="space-y-3">
                {analytics.topEarners.length === 0 ? (
                  <p className="text-gray-500 text-sm">No earners yet</p>
                ) : analytics.topEarners.map((user: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-secondary text-gray-400'}`}>{i + 1}</span>
                      <div>
                        <div className="text-white text-sm font-medium">{user.name ?? 'Anonymous'}</div>
                        <div className="text-gray-500 text-xs">Level {user.level}</div>
                      </div>
                    </div>
                    <div className="text-yellow-400 text-sm font-bold">{user.totalEarned.toLocaleString()} <span className="text-gray-500 font-normal">pts</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location Change Alerts */}
          {locationAlerts && locationAlerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white font-medium">Action Required</div>
                <div className="text-gray-400 text-sm">{locationAlerts.length} user{locationAlerts.length > 1 ? 's' : ''} logged in from different {locationAlerts.length > 1 ? 'countries' : 'country'}</div>
              </div>
              <Link href="/admin/users">
                <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  Review Now
                </button>
              </Link>
            </div>
          )}

          {/* Pending Redemptions Alert */}
          {analytics.pendingRedemptions > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white font-medium">Action Required</div>
                <div className="text-gray-400 text-sm">{analytics.pendingRedemptions} redemption{analytics.pendingRedemptions > 1 ? 's' : ''} pending approval</div>
              </div>
              <Link href="/admin/redemptions">
                <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  Review Now
                </button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-12">Failed to load analytics</div>
      )}
    </AdminLayout>
  );
}
