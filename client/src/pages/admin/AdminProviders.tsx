import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, ExternalLink } from "lucide-react";

type ProviderForm = {
  name: string; description: string; logoUrl: string; websiteUrl: string;
  isActive: boolean; sortOrder: number; totalOffers: number;
};

const defaultForm: ProviderForm = {
  name: '', description: '', logoUrl: '', websiteUrl: '',
  isActive: true, sortOrder: 0, totalOffers: 0,
};

function ProviderModal({ provider, onClose }: { provider?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ProviderForm>(provider ? {
    name: provider.name, description: provider.description ?? '',
    logoUrl: provider.logoUrl ?? '', websiteUrl: provider.websiteUrl ?? '',
    isActive: provider.isActive, sortOrder: provider.sortOrder, totalOffers: provider.totalOffers ?? 0,
  } : defaultForm);

  const create = trpc.admin.offerProviders.create.useMutation({ onSuccess: () => { toast.success("Provider created!"); utils.admin.offerProviders.list.invalidate(); onClose(); } });
  const update = trpc.admin.offerProviders.update.useMutation({ onSuccess: () => { toast.success("Provider updated!"); utils.admin.offerProviders.list.invalidate(); onClose(); } });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    provider ? update.mutate({ providerId: provider.id, ...form }) : create.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-white text-xl font-bold">{provider ? 'Edit Provider' : 'Add Provider'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-gray-400 text-xs mb-1 block">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Offertoro" /></div>
          <div><label className="text-gray-400 text-xs mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-gray-400 text-xs mb-1 block">Logo URL</label>
              <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://..." /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Website URL</label>
              <input value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-gray-400 text-xs mb-1 block">Total Offers</label>
              <input type="number" value={form.totalOffers} onChange={e => setForm(f => ({ ...f, totalOffers: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" /></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
            </button>
            <span className="text-white text-sm">{form.isActive ? 'Active (visible to users)' : 'Inactive (hidden)'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={create.isPending || update.isPending}
              className="flex-1 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {create.isPending || update.isPending ? 'Saving...' : provider ? 'Save Changes' : 'Add Provider'}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-secondary text-gray-400 rounded-xl hover:bg-secondary/80 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProviders() {
  const utils = trpc.useUtils();
  const { data: providers, isLoading } = trpc.admin.offerProviders.list.useQuery();
  const [modal, setModal] = useState<any | null | 'new'>(null);
  const deleteProvider = trpc.admin.offerProviders.delete.useMutation({
    onSuccess: () => { toast.success("Provider deleted"); utils.admin.offerProviders.list.invalidate(); }
  });
  const updateProvider = trpc.admin.offerProviders.update.useMutation({
    onSuccess: () => utils.admin.offerProviders.list.invalidate()
  });

  return (
    <AdminLayout title="Offer Providers" subtitle={`${providers?.length ?? 0} providers`}>
      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <ProviderModal provider={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />
      )}
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setModal('new')} className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Provider", "Total Offers", "Sort", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>)}
                </tr>
              )) : providers?.map((p: any) => (
                <tr key={p.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.logoUrl ? (
                        <img src={p.logoUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-secondary" onError={e => { (e.target as any).style.display = 'none'; }} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 text-xs font-bold">{p.name?.[0]}</div>
                      )}
                      <div>
                        <div className="text-white font-medium text-sm">{p.name}</div>
                        {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 text-xs flex items-center gap-1 hover:text-primary transition-colors"><ExternalLink className="w-3 h-3" /> Website</a>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{p.totalOffers ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{p.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => updateProvider.mutate({ providerId: p.id, isActive: !p.isActive })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${p.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(p)} className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-all">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProvider.mutate({ providerId: p.id }); }}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && (!providers || providers.length === 0) && (
            <div className="text-center py-12 text-gray-500">No providers yet. <button onClick={() => setModal('new')} className="text-primary hover:underline">Add one</button></div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
