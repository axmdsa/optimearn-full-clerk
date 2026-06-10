import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const REWARD_CATEGORIES = ['gift_card', 'paypal', 'crypto', 'gaming', 'other'] as const;

const categoryColors: Record<string, string> = {
  gift_card: 'bg-blue-500/10 text-blue-400',
  paypal: 'bg-primary/10 text-primary',
  crypto: 'bg-yellow-500/10 text-yellow-400',
  gaming: 'bg-purple-500/10 text-purple-400',
  other: 'bg-secondary text-gray-400',
};

type RewardForm = {
  name: string; description: string; category: typeof REWARD_CATEGORIES[number];
  pointsCost: number; imageUrl: string; brand: string; isAvailable: boolean; sortOrder: number;
};

const defaultForm: RewardForm = {
  name: '', description: '', category: 'gift_card', pointsCost: 1000,
  imageUrl: '', brand: '', isAvailable: true, sortOrder: 0,
};

function RewardModal({ reward, onClose }: { reward?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<RewardForm>(reward ? {
    name: reward.name, description: reward.description ?? '', category: reward.category,
    pointsCost: reward.pointsCost, imageUrl: reward.imageUrl ?? '', brand: reward.brand ?? '',
    isAvailable: reward.isAvailable, sortOrder: reward.sortOrder,
  } : defaultForm);

  const create = trpc.admin.rewards.create.useMutation({ onSuccess: () => { toast.success("Reward created!"); utils.admin.rewards.list.invalidate(); onClose(); } });
  const update = trpc.admin.rewards.update.useMutation({ onSuccess: () => { toast.success("Reward updated!"); utils.admin.rewards.list.invalidate(); onClose(); } });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    reward ? update.mutate({ rewardId: reward.id, ...form }) : create.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-white text-xl font-bold">{reward ? 'Edit Reward' : 'Create Reward'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-gray-400 text-xs mb-1 block">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Amazon Gift Card $10" /></div>
          <div><label className="text-gray-400 text-xs mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-gray-400 text-xs mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {REWARD_CATEGORIES.map(c => <option key={c} value={c} className="bg-background">{c.replace('_', ' ')}</option>)}</select></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Brand</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Amazon, PayPal..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-gray-400 text-xs mb-1 block">Points Cost</label>
              <input type="number" value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: Number(e.target.value) }))} className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" /></div>
          </div>
          <div><label className="text-gray-400 text-xs mb-1 block">Image URL</label>
            <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://..." /></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}>
              {form.isAvailable ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
            </button>
            <span className="text-white text-sm">{form.isAvailable ? 'Available in shop' : 'Hidden from shop'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={create.isPending || update.isPending} className="flex-1 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {create.isPending || update.isPending ? 'Saving...' : reward ? 'Save Changes' : 'Create Reward'}</button>
            <button onClick={onClose} className="px-6 py-3 bg-secondary text-gray-400 rounded-xl hover:bg-secondary/80 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRewards() {
  const utils = trpc.useUtils();
  const { data: rewards, isLoading } = trpc.admin.rewards.list.useQuery();
  const [modal, setModal] = useState<any | null | 'new'>(null);
  const deleteReward = trpc.admin.rewards.delete.useMutation({ onSuccess: () => { toast.success("Reward deleted"); utils.admin.rewards.list.invalidate(); } });
  const updateReward = trpc.admin.rewards.update.useMutation({ onSuccess: () => utils.admin.rewards.list.invalidate() });

  return (
    <AdminLayout title="Rewards Shop" subtitle={`${rewards?.length ?? 0} rewards`}>
      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <RewardModal reward={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />
      )}
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm">
            <Plus className="w-4 h-4" /> New Reward
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse" />
          )) : rewards?.map((reward: any) => (
            <div key={reward.id} className="bg-background border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{reward.name}</div>
                  {reward.brand && <div className="text-gray-500 text-xs">{reward.brand}</div>}
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize ml-2 flex-shrink-0", categoryColors[reward.category] ?? 'bg-secondary text-gray-400')}>
                  {reward.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-primary font-bold">{reward.pointsCost.toLocaleString()} pts</div>
                <button onClick={() => updateReward.mutate({ rewardId: reward.id, isAvailable: !reward.isAvailable })}
                  className={cn("text-xs px-2 py-0.5 rounded-full font-medium transition-all", reward.isAvailable ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
                  {reward.isAvailable ? 'Available' : 'Hidden'}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(reward)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs transition-all">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${reward.name}"?`)) deleteReward.mutate({ rewardId: reward.id }); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-all">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        {!isLoading && rewards?.length === 0 && (
          <div className="text-center py-12 text-gray-500">No rewards yet. <button onClick={() => setModal('new')} className="text-primary hover:underline">Create one</button></div>
        )}
      </div>
    </AdminLayout>
  );
}
