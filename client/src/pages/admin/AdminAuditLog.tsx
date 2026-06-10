import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Search, RefreshCw, Shield, User, Settings, Zap, Gift, Bell, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create_task: <Zap className="w-3 h-3" />,
  update_task: <Zap className="w-3 h-3" />,
  delete_task: <Zap className="w-3 h-3" />,
  create_reward: <Gift className="w-3 h-3" />,
  update_reward: <Gift className="w-3 h-3" />,
  delete_reward: <Gift className="w-3 h-3" />,
  create_achievement: <Trophy className="w-3 h-3" />,
  update_achievement: <Trophy className="w-3 h-3" />,
  delete_achievement: <Trophy className="w-3 h-3" />,
  update_user: <User className="w-3 h-3" />,
  adjust_points: <User className="w-3 h-3" />,
  update_setting: <Settings className="w-3 h-3" />,
  broadcast_notification: <Bell className="w-3 h-3" />,
  send_notification: <Bell className="w-3 h-3" />,
};

const ACTION_COLORS: Record<string, string> = {
  delete_task: 'text-red-400',
  delete_reward: 'text-red-400',
  delete_achievement: 'text-red-400',
  create_task: 'text-green-400',
  create_reward: 'text-green-400',
  create_achievement: 'text-green-400',
  broadcast_notification: 'text-yellow-400',
  adjust_points: 'text-blue-400',
};

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const { data: logs, isLoading, refetch } = trpc.admin.auditLog.list.useQuery({ limit, offset: 0 });

  const filtered = logs?.filter((log: any) =>
    !search || log.action?.includes(search.toLowerCase()) || log.adminName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Audit Log" subtitle="Complete history of admin actions">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions or admins..."
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
            {[50, 100, 250, 500].map(n => <option key={n} value={n} className="bg-background">Last {n}</option>)}
          </select>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-gray-400 rounded-xl text-sm transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Time", "Admin", "Action", "Target", "Details"].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>)}
                </tr>
              )) : filtered?.map((log: any) => (
                <tr key={log.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-white text-sm">{log.adminName ?? `Admin #${log.adminId}`}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn("flex items-center gap-1.5 text-sm font-medium", ACTION_COLORS[log.action] ?? 'text-gray-300')}>
                      {ACTION_ICONS[log.action] ?? <Zap className="w-3 h-3" />}
                      <span className="capitalize">{log.action?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {log.targetType && <span className="capitalize">{log.targetType} {log.targetId ? `#${log.targetId}` : ''}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {log.details ? (
                      <span title={JSON.stringify(log.details, null, 2)} className="cursor-help">
                        {Object.entries(log.details as Record<string, any>).slice(0, 2).map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`).join(', ')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && (!filtered || filtered.length === 0) && (
            <div className="text-center py-12 text-gray-500">No audit log entries found.</div>
          )}
        </div>

        {filtered && filtered.length > 0 && (
          <div className="text-gray-500 text-xs text-right">{filtered.length} entries shown</div>
        )}
      </div>
    </AdminLayout>
  );
}
