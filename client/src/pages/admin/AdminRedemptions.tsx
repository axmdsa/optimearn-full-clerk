import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'failed'] as const;

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  processing: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
};

export default function AdminRedemptions() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const { data, isLoading } = trpc.admin.redemptions.list.useQuery({ status: statusFilter === 'all' ? undefined : statusFilter });

  const updateStatus = trpc.admin.redemptions.updateStatus.useMutation({
    onSuccess: (_, vars) => { toast.success(`Redemption ${vars.status}!`); utils.admin.redemptions.list.invalidate(); }
  });

  return (
    <AdminLayout title="Redemptions" subtitle="Manage reward redemption requests">
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                statusFilter === s ? 'bg-primary text-black' : 'bg-secondary text-gray-400 hover:bg-secondary/80')}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "Reward", "Points Cost", "Payment Details", "Status", "Requested", "Actions"].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                  ))}
                </tr>
              )) : data?.map((item: any) => (
                <tr key={item.redemption.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-medium">{item.user?.name ?? 'Unknown'}</div>
                    <div className="text-gray-500 text-xs">{item.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm">{item.reward?.name ?? 'Unknown'}</div>
                    <div className="text-gray-500 text-xs capitalize">{item.reward?.category?.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-primary font-bold text-sm">{item.redemption.pointsSpent?.toLocaleString()}</td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {item.redemption.paymentAddress ? (
                      <div>
                        <div className="text-xs font-medium text-gray-300 capitalize">{item.redemption.paymentMethod?.replace('_', ' ') ?? 'Other'}</div>
                        <div className="text-xs text-primary font-mono truncate" title={item.redemption.paymentAddress}>{item.redemption.paymentAddress}</div>
                        {item.redemption.paymentNote && <div className="text-xs text-gray-500 truncate" title={item.redemption.paymentNote}>Note: {item.redemption.paymentNote}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", statusColors[item.redemption.status] ?? 'bg-secondary text-gray-400')}>
                      {item.redemption.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(item.redemption.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {item.redemption.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus.mutate({ redemptionId: item.redemption.id, status: 'completed' })} disabled={updateStatus.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs transition-all disabled:opacity-50">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => updateStatus.mutate({ redemptionId: item.redemption.id, status: 'failed' })} disabled={updateStatus.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-all disabled:opacity-50">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        {item.redemption.status === 'completed' ? '✓ Completed' : item.redemption.status === 'processing' ? '⏳ Processing' : '✗ Failed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && (!data || data.length === 0) && (
            <div className="text-center py-12 text-gray-500">No {statusFilter !== 'all' ? statusFilter : ''} redemptions found</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
