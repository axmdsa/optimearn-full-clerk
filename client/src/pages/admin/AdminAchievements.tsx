import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACHIEVEMENT_CATEGORIES = ['earning', 'social', 'streak', 'level', 'special'] as const;
const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500/10 text-gray-400',
  rare: 'bg-blue-500/10 text-blue-400',
  epic: 'bg-purple-500/10 text-purple-400',
  legendary: 'bg-yellow-500/10 text-yellow-400',
};

type AchievementForm = {
  name: string; description: string; icon: string;
  category: typeof ACHIEVEMENT_CATEGORIES[number];
  requirement: number; pointsBonus: number;
  rarity: typeof RARITIES[number];
};

const defaultForm: AchievementForm = {
  name: '', description: '', icon: '🏆',
  category: 'tasks' as any,
  requirement: 1, pointsBonus: 100, rarity: 'common',
};

function AchievementModal({ achievement, onClose }: { achievement?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<AchievementForm>(achievement ? {
    name: achievement.name ?? achievement.title ?? '',
    description: achievement.description ?? '',
    icon: achievement.icon ?? '🏆',
    category: achievement.category ?? 'special',
    requirement: achievement.requirement ?? 1,
    pointsBonus: achievement.pointsBonus ?? achievement.pointsReward ?? 100,
    rarity: achievement.rarity ?? 'common',
  } : { ...defaultForm, category: 'earning' });

  const create = trpc.admin.achievements.create.useMutation({ onSuccess: () => { toast.success("Achievement created!"); utils.admin.achievements.list.invalidate(); onClose(); } });
  const update = trpc.admin.achievements.update.useMutation({ onSuccess: () => { toast.success("Achievement updated!"); utils.admin.achievements.list.invalidate(); onClose(); } });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (achievement) {
      update.mutate({ achievementId: achievement.id, ...form });
    } else {
      create.mutate(form);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-white text-xl font-bold">{achievement ? 'Edit Achievement' : 'Create Achievement'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Icon</label>
              <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-2xl text-center focus:outline-none focus:border-primary/50" />
            </div>
            <div className="col-span-3">
              <label className="text-gray-400 text-xs mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Achievement name..." />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {ACHIEVEMENT_CATEGORIES.map(c => <option key={c} value={c} className="bg-background">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Rarity</label>
              <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value as any }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {RARITIES.map(r => <option key={r} value={r} className="bg-background">{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Requirement Value</label>
              <input type="number" value={form.requirement} onChange={e => setForm(f => ({ ...f, requirement: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Points Bonus</label>
              <input type="number" value={form.pointsBonus} onChange={e => setForm(f => ({ ...f, pointsBonus: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={create.isPending || update.isPending}
              className="flex-1 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {create.isPending || update.isPending ? 'Saving...' : achievement ? 'Save Changes' : 'Create Achievement'}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-secondary text-gray-400 rounded-xl hover:bg-secondary/80 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAchievements() {
  const utils = trpc.useUtils();
  const { data: achievements, isLoading } = trpc.admin.achievements.list.useQuery();
  const [modal, setModal] = useState<any | null | 'new'>(null);
  const deleteAchievement = trpc.admin.achievements.delete.useMutation({
    onSuccess: () => { toast.success("Achievement deleted"); utils.admin.achievements.list.invalidate(); }
  });

  return (
    <AdminLayout title="Achievements" subtitle={`${achievements?.length ?? 0} achievements`}>
      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <AchievementModal achievement={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />
      )}
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm">
            <Plus className="w-4 h-4" /> New Achievement
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-secondary rounded-xl animate-pulse" />
          )) : achievements?.map((ach: any) => (
            <div key={ach.id} className="bg-background border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{ach.icon ?? '🏆'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{ach.name ?? ach.title}</div>
                  <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ach.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-secondary text-gray-400 rounded-full capitalize">{ach.category}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", rarityColors[ach.rarity ?? 'common'])}>{ach.rarity ?? 'common'}</span>
                <span className="text-xs text-primary">+{ach.pointsBonus ?? 0} pts</span>
              </div>
              <div className="text-xs text-gray-500">Requirement: {ach.requirement}</div>
              <div className="flex gap-2">
                <button onClick={() => setModal(ach)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs transition-all">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${ach.name ?? ach.title}"?`)) deleteAchievement.mutate({ achievementId: ach.id }); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-all">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        {!isLoading && achievements?.length === 0 && (
          <div className="text-center py-12 text-gray-500">No achievements yet. <button onClick={() => setModal('new')} className="text-primary hover:underline">Create one</button></div>
        )}
      </div>
    </AdminLayout>
  );
}
