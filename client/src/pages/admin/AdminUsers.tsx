import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { getInitials } from "@shared/const";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, Edit2, Coins, Eye,
  Shield, User, X, CheckCircle, XCircle, Star, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{children}</span>;
}

function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.admin.users.getDetail.useQuery({ userId });
  const utils = trpc.useUtils();
  const adjustPoints = trpc.admin.users.adjustPoints.useMutation({
    onSuccess: () => { toast.success("Points adjusted!"); utils.admin.users.getDetail.invalidate({ userId }); setAdjustOpen(false); }
  });
  const updateUser = trpc.admin.users.update.useMutation({
    onSuccess: () => { toast.success("User updated!"); utils.admin.users.getDetail.invalidate({ userId }); utils.admin.users.list.invalidate(); setEditOpen(false); }
  });
  const banUserMutation = trpc.admin.users.ban.useMutation({
    onSuccess: () => { toast.success("User banned!"); utils.admin.users.getDetail.invalidate({ userId }); utils.admin.users.list.invalidate(); setBanOpen(false); }
  });
  const unbanUserMutation = trpc.admin.users.unban.useMutation({
    onSuccess: () => { toast.success("User unbanned!"); utils.admin.users.getDetail.invalidate({ userId }); utils.admin.users.list.invalidate(); }
  });
  const getLoginHistory = trpc.admin.users.getLoginHistory.useQuery({ userId, limit: 10 });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [banReason, setBanReason] = useState("");
  const [banOpen, setBanOpen] = useState(false);

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { user, taskHistory, txHistory, redemptionHistory } = data ?? {};

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-black text-lg font-bold">
              {getInitials(user?.name)}
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">{user?.name ?? 'Unknown'}</h2>
              <p className="text-gray-400 text-sm">{user?.email ?? 'No email'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Points", value: user?.points?.toLocaleString() ?? 0, color: "text-primary" },
              { label: "Total Earned", value: user?.totalEarned?.toLocaleString() ?? 0, color: "text-yellow-400" },
              { label: "Level", value: user?.level ?? 1, color: "text-blue-400" },
              { label: "Streak", value: `${user?.streak ?? 0}d`, color: "text-orange-400" },
            ].map(s => (
              <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">Role</span><Badge color={user?.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-gray-300'}>{user?.role}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-400">Login Method</span><span className="text-white">{user?.loginMethod ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Referral Code</span><span className="text-white font-mono">{user?.referralCode ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">User ID</span><span className="text-primary font-mono text-xs">{user?.userId ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Country</span><span className="text-white">{user?.country ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">IP Address</span><span className="text-white font-mono text-xs">{user?.ipAddress ?? 'N/A'}</span></div>
              {user?.isBanned && (
                <div className="flex justify-between"><span className="text-gray-400">Ban Status</span><Badge color="bg-red-500/10 text-red-400">BANNED</Badge></div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">XP</span><span className="text-white">{user?.xp ?? 0} / {user?.xpToNextLevel ?? 500}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Joined</span><span className="text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Last Sign In</span><span className="text-white">{user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : 'N/A'}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => { setEditData({ name: user?.name, email: user?.email, role: user?.role, points: user?.points, xp: user?.xp, level: user?.level, streak: user?.streak }); setEditOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium">
              <Edit2 className="w-4 h-4" /> Edit User
            </button>
            <button onClick={() => setAdjustOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-all text-sm font-medium">
              <Coins className="w-4 h-4" /> Adjust Points
            </button>
            <button onClick={() => updateUser.mutate({ userId, role: user?.role === 'admin' ? 'user' : 'admin' })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all text-sm font-medium">
              <Shield className="w-4 h-4" /> {user?.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            </button>
            {user?.isBanned ? (
              <button onClick={() => unbanUserMutation.mutate({ userId })}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-all text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Unban User
              </button>
            ) : (
              <button onClick={() => setBanOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium">
                <XCircle className="w-4 h-4" /> Ban User
              </button>
            )}
          </div>

          {/* Edit Form */}
          {editOpen && (
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <h4 className="text-white font-semibold">Edit User</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name', label: 'Name', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'points', label: 'Points', type: 'number' },
                  { key: 'xp', label: 'XP', type: 'number' },
                  { key: 'level', label: 'Level', type: 'number' },
                  { key: 'streak', label: 'Streak', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                    <input type={f.type} value={editData[f.key] ?? ''} onChange={e => setEditData((d: any) => ({ ...d, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateUser.mutate({ userId, ...editData })} disabled={updateUser.isPending}
                  className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 bg-secondary text-gray-400 rounded-lg text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Adjust Points Form */}
          {adjustOpen && (
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <h4 className="text-white font-semibold">Adjust Points</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Amount (negative to deduct)</label>
                  <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Reason</label>
                  <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => adjustPoints.mutate({ userId, amount: adjustAmount, reason: adjustReason })} disabled={adjustPoints.isPending || !adjustReason}
                  className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {adjustPoints.isPending ? 'Adjusting...' : 'Apply Adjustment'}
                </button>
                <button onClick={() => setAdjustOpen(false)} className="px-4 py-2 bg-secondary text-gray-400 rounded-lg text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Ban User Form */}
          {banOpen && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
              <h4 className="text-red-400 font-semibold">Ban User</h4>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ban Reason</label>
                <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g., Multiple accounts, Fraud, Spam"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => banUserMutation.mutate({ userId, reason: banReason })} disabled={banUserMutation.isPending || !banReason}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
                  {banUserMutation.isPending ? 'Banning...' : 'Confirm Ban'}
                </button>
                <button onClick={() => setBanOpen(false)} className="px-4 py-2 bg-secondary text-gray-400 rounded-lg text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Login History */}
          <div>
            <h4 className="text-white font-semibold mb-3">Login History</h4>
            {getLoginHistory.isLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : getLoginHistory.data?.length === 0 ? (
              <p className="text-gray-500 text-sm">No login history</p>
            ) : (
              <div className="space-y-2">
                {getLoginHistory.data?.slice(0, 10).map((login: any) => (
                  <div key={login.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <div>
                      <div className="text-white text-sm">Logged in from {login.country || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs font-mono">{login.ipAddress}</div>
                      <div className="text-gray-500 text-xs">{new Date(login.loginAt).toLocaleString()}</div>
                    </div>
                    {user?.lastLoginCountry && user.lastLoginCountry !== login.country && (
                      <Badge color="bg-yellow-500/10 text-yellow-400">Location Change</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task History */}
          <div>
            <h4 className="text-white font-semibold mb-3">Recent Task History</h4>
            {taskHistory?.length === 0 ? <p className="text-gray-500 text-sm">No task history</p> : (
              <div className="space-y-2">
                {taskHistory?.slice(0, 8).map((item: any) => (
                  <div key={item.userTask.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <div>
                      <div className="text-white text-sm">{item.task?.title ?? 'Unknown Task'}</div>
                      <div className="text-gray-500 text-xs">{new Date(item.userTask.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.userTask.pointsEarned > 0 && <span className="text-primary text-sm font-bold">+{item.userTask.pointsEarned}</span>}
                      <Badge color={item.userTask.status === 'completed' ? 'bg-green-500/10 text-green-400' : item.userTask.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-secondary text-gray-400'}>{item.userTask.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div>
            <h4 className="text-white font-semibold mb-3">Recent Transactions</h4>
            {txHistory?.length === 0 ? <p className="text-gray-500 text-sm">No transactions</p> : (
              <div className="space-y-2">
                {txHistory?.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <div>
                      <div className="text-white text-sm">{tx.description}</div>
                      <div className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={`text-sm font-bold ${tx.amount > 0 ? 'text-primary' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const limit = 20;

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({ search: debouncedSearch || undefined, limit, offset: page * limit });
  const { data: duplicateAlerts } = trpc.admin.duplicateAccounts.list.useQuery({ resolved: false });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(0); }, 400);
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <AdminLayout title="Users" subtitle={`${data?.total ?? 0} total users`}>
      {selectedUserId && <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}

      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
          <button onClick={() => refetch()} className="px-4 py-2.5 bg-secondary border border-border text-gray-400 rounded-xl hover:bg-secondary/80 text-sm transition-all">Refresh</button>
        </div>

        {/* Table */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "OptimEarn-ID", "Country", "Alerts", "Role", "Points", "Level", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.list.map((user: any) => (
                <tr key={user.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/80/30 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{user.name ?? 'Anonymous'}</div>
                        <div className="text-gray-500 text-xs">{user.email ?? 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{user.userId ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{user.country ?? 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.country && user.originalCountry && user.country !== user.originalCountry ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Different</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">-</span>
                      )}
                      {duplicateAlerts?.some((alert: any) => {
                        try {
                          const userIds = JSON.parse(alert.userIds || '[]');
                          return userIds.includes(user.userId);
                        } catch {
                          return false;
                        }
                      }) && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Duplicate</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-gray-400'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-primary font-bold text-sm">{user.points?.toLocaleString() ?? 0}</td>
                  <td className="px-4 py-3 text-white text-sm">Lvl {user.level ?? 1}</td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <Badge color="bg-red-500/10 text-red-400">BANNED</Badge>
                    ) : (
                      <Badge color="bg-green-500/10 text-green-400">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUserId(user.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-gray-400 hover:text-white rounded-lg text-xs transition-all">
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Page {page + 1} of {totalPages} · {data?.total} users</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 bg-secondary border border-border text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-all flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 bg-secondary border border-border text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-all flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
