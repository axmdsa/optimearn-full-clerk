import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Users, Zap, Gift, TrendingUp, Star, DollarSign, Activity, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ['#00ff87', '#60efff', '#ff6b6b', '#ffd93d', '#c77dff'];

function StatCard({ icon, label, value, sub, color = '#00ff87' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-gray-400 text-sm">{label}</div>
        {sub && <div className="text-gray-600 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = trpc.admin.analytics.useQuery();

  if (isLoading) {
    return (
      <AdminLayout title="Analytics" subtitle="Platform performance overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}
        </div>
      </AdminLayout>
    );
  }

  const a = analytics;

  const taskCategoryData = a?.topTasks?.map((t: any) => ({ name: t.task?.title?.slice(0, 15) ?? 'Task', value: Number(t.completions ?? 0) })) ?? [];
  const rewardCategoryData = taskCategoryData;
  const topEarners = a?.topEarners ?? [];

  return (
    <AdminLayout title="Analytics" subtitle="Platform performance overview">
      <div className="space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={a?.totalUsers?.toLocaleString() ?? 0} color="#00ff87" />
          <StatCard icon={<Zap className="w-5 h-5" />} label="Total Tasks" value={a?.totalTasks?.toLocaleString() ?? 0} color="#60efff" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Completions" value={a?.totalCompletions?.toLocaleString() ?? 0} color="#ffd93d" />
          <StatCard icon={<Gift className="w-5 h-5" />} label="Redemptions" value={a?.totalRedemptions?.toLocaleString() ?? 0} color="#ff6b6b" />
          <StatCard icon={<DollarSign className="w-5 h-5" />} label="Points Issued" value={(a?.totalPointsIssued ?? 0).toLocaleString()} sub="across all users" color="#c77dff" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="New This Week" value={a?.newUsersThisWeek?.toLocaleString() ?? 0} sub="new users" color="#00ff87" />
          <StatCard icon={<Award className="w-5 h-5" />} label="Completions/Week" value={a?.completionsThisWeek?.toLocaleString() ?? 0} sub="this week" color="#ffd93d" />
          <StatCard icon={<Star className="w-5 h-5" />} label="Points Spent" value={(a?.totalPointsSpent ?? 0).toLocaleString()} color="#60efff" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Category */}
          <div className="bg-background border border-border rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Tasks by Category</h3>
            {taskCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={taskCategoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {taskCategoryData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No task data yet</div>
            )}
          </div>

          {/* Top Tasks */}
          <div className="bg-background border border-border rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Top Tasks by Completions</h3>
            {rewardCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rewardCategoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="value" fill="#00ff87" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No reward data yet</div>
            )}
          </div>
        </div>

        {/* Top Earners */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Top Earners</h3>
          {topEarners.length > 0 ? (
            <div className="space-y-3">
              {topEarners.map((u: any, i: number) => (
                <div key={u.id} className="flex items-center gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-secondary text-gray-500'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{u.name ?? `User #${u.id}`}</div>
                    <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-primary to-[#60efff]"
                        style={{ width: `${Math.min(100, (u.totalEarned / (topEarners[0]?.totalEarned || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-primary font-semibold text-sm flex-shrink-0">{u.totalEarned?.toLocaleString()} pts</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No user data yet</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
