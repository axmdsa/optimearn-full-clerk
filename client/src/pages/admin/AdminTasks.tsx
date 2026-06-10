import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import React from "react";
import { toast } from "sonner";
import PostbackTester from "./PostbackTester";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, ImagePlus, GripVertical, ExternalLink, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@shared/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ['survey', 'video', 'app_trial', 'offer', 'app_install', 'daily', 'social', 'play_to_earn'] as const;
const FREQUENCIES = ['once', 'daily', 'weekly'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const categoryColors: Record<string, string> = {
  survey: 'bg-blue-500/10 text-blue-400',
  video: 'bg-purple-500/10 text-purple-400',
  app_trial: 'bg-yellow-500/10 text-yellow-400',
  offer: 'bg-primary/10 text-primary',
  daily: 'bg-orange-500/10 text-orange-400',
  social: 'bg-pink-500/10 text-pink-400',
  play_to_earn: 'bg-red-500/10 text-red-400',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  hard: 'bg-red-500/10 text-red-400',
};

type TaskForm = {
  title: string; description: string; category: typeof CATEGORIES[number];
  points: number; xpReward: number; timeMinutes: number;
  frequency: typeof FREQUENCIES[number]; difficulty: typeof DIFFICULTIES[number];
  imageUrl: string; thumbnailUrl: string; offerUrl: string; screenshots: string[]; providerName: string;
  requirements: string; disclaimer: string; isActive: boolean; isFeatured: boolean; isTrending: boolean; sortOrder: number;
  targetCountries: string[]; targetDevices: string[];
  affiliateNetworkId: number | null; publisherPayout: number; postbackUrl: string;
};

const DEVICES = ['iOS', 'Android', 'PC'] as const;

type CategoryId = 'survey' | 'video' | 'app_trial' | 'app_install' | 'offer' | 'daily' | 'social' | 'play_to_earn';

const allCategories: { id: CategoryId; label: string }[] = [
  { id: 'daily',     label: 'Daily' },
  { id: 'survey',    label: 'Surveys' },
  { id: 'video',     label: 'Videos' },
  { id: 'app_trial', label: 'App Trials' },
  { id: 'app_install', label: 'App Installs' },
  { id: 'offer',     label: 'Offers' },
  { id: 'social',    label: 'Social' },
  { id: 'play_to_earn', label: 'Play to Earn' },
];

function CountryMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter(c => c !== code));
    else onChange([...value, code]);
  };
  return (
    <div className="relative">
      <div
        className="min-h-9 w-full px-3 py-1 border border-border rounded-xl bg-secondary text-white text-sm cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0 && <span className="text-gray-500">All countries (no restriction)</span>}
        {value.map(code => (
          <span key={code} className="inline-flex items-center gap-1 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded">
            {code}
            <button onClick={(e) => { e.stopPropagation(); toggle(code); }} className="hover:text-red-400">×</button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <input
              placeholder="Search countries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary text-gray-400" onClick={() => { onChange([]); setOpen(false); }}>Clear (All countries)</button>
            {filtered.map(c => (
              <button key={c.code} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-secondary flex items-center gap-2 ${value.includes(c.code) ? 'bg-primary/10 text-primary' : 'text-white'}`} onClick={() => toggle(c.code)}>
                <span className="font-mono text-gray-500 w-6">{c.code}</span>{c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const defaultForm: TaskForm = {
  title: '', description: '', category: 'offer', points: 100, xpReward: 50,
  timeMinutes: 5, frequency: 'once', difficulty: 'easy', imageUrl: '', thumbnailUrl: '', offerUrl: '',
  screenshots: [], providerName: '', requirements: '', disclaimer: '',
  isActive: true, isFeatured: false, isTrending: false, sortOrder: 0,
  targetCountries: [], targetDevices: [],
  affiliateNetworkId: null, publisherPayout: 0, postbackUrl: '',
};

function parseScreenshots(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Screenshot URL Manager ───────────────────────────────────────────────────
function ScreenshotManager({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [newUrl, setNewUrl] = useState('');

  const addUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http')) { toast.error('URL must start with http'); return; }
    if (urls.includes(trimmed)) { toast.error('URL already added'); return; }
    onChange([...urls, trimmed]);
    setNewUrl('');
  };

  const removeUrl = (idx: number) => onChange(urls.filter((_, i) => i !== idx));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...urls];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === urls.length - 1) return;
    const next = [...urls];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="text-gray-400 text-xs block">Screenshot Images ({urls.length} added)</label>

      {/* Add new URL row */}
      <div className="flex gap-2">
        <input
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
          className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
          placeholder="https://example.com/screenshot.png"
        />
        <button
          type="button"
          onClick={addUrl}
          className="px-4 py-2 bg-primary text-black rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <ImagePlus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* URL list with previews */}
      {urls.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl p-2">
              {/* Thumbnail */}
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                <img
                  src={url}
                  alt={`Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="40"><rect width="56" height="40" fill="%23333"/><text x="50%" y="55%" text-anchor="middle" fill="%23666" font-size="10">ERR</text></svg>'; }}
                />
              </div>
              {/* URL truncated */}
              <span className="flex-1 text-xs text-gray-400 truncate min-w-0">{url}</span>
              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 text-xs">↑</button>
                <button type="button" onClick={() => moveDown(idx)} disabled={idx === urls.length - 1}
                  className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 text-xs">↓</button>
                <a href={url} target="_blank" rel="noreferrer"
                  className="w-6 h-6 rounded bg-secondary hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400">
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button type="button" onClick={() => removeUrl(idx)}
                  className="w-6 h-6 rounded bg-secondary hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {urls.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-4 text-center text-gray-500 text-sm">
          No screenshots added yet. Paste an image URL above and click Add.
        </div>
      )}
    </div>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, onClose }: { task?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: networks = [] } = trpc.admin.networks.list.useQuery();
  const [form, setForm] = useState<TaskForm>(task ? {
    title: task.title, description: task.description ?? '', category: task.category,
    points: task.points, xpReward: task.xpReward, timeMinutes: task.timeMinutes,
    frequency: task.frequency, difficulty: task.difficulty, imageUrl: task.imageUrl ?? '', thumbnailUrl: task.thumbnailUrl ?? '', offerUrl: task.offerUrl ?? '',
    screenshots: parseScreenshots(task.screenshots),
    providerName: task.providerName ?? '', requirements: task.requirements ?? '',
    disclaimer: task.disclaimer ?? '', isActive: task.isActive, isFeatured: task.isFeatured ?? false, isTrending: task.isTrending ?? false, sortOrder: task.sortOrder,
    targetCountries: task.targetCountries ? (() => { try { return JSON.parse(task.targetCountries); } catch { return []; } })() : [],
    targetDevices: task.targetDevices ? (() => { try { return JSON.parse(task.targetDevices); } catch { return []; } })() : [],
    affiliateNetworkId: task.affiliateNetworkId ?? null, publisherPayout: task.publisherPayout ?? 0, postbackUrl: task.postbackUrl ?? '',
  } : defaultForm);

  const createTask = trpc.admin.tasks.create.useMutation({
    onMutate: async (variables) => {
      // Optimistic update: keep form state as-is during mutation
      return { previousForm: form };
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousForm) setForm(context.previousForm);
      toast.error("Failed to create task");
    },
    onSuccess: () => { toast.success("Task created!"); utils.admin.tasks.list.invalidate(); onClose(); }
  });
  const updateTask = trpc.admin.tasks.update.useMutation({
    onMutate: async (variables) => {
      // Optimistic update: keep form state as-is during mutation
      return { previousForm: form };
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousForm) setForm(context.previousForm);
      toast.error("Failed to update task");
    },
    onSuccess: () => { toast.success("Task updated!"); utils.admin.tasks.list.invalidate(); onClose(); }
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const payload: any = {
      ...form,
      points: Number(form.points) || 0,
      xpReward: Number(form.xpReward) || 0,
      timeMinutes: Number(form.timeMinutes) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      screenshots: form.screenshots.length > 0 ? form.screenshots : undefined,
      targetCountries: form.targetCountries.length > 0 ? JSON.stringify(form.targetCountries) : undefined,
      targetDevices: form.targetDevices.length > 0 ? JSON.stringify(form.targetDevices) : undefined,
    };
    
    // Only include affiliate fields if they have valid values
    if (form.affiliateNetworkId) {
      payload.affiliateNetworkId = Number(form.affiliateNetworkId);
    } else {
      payload.affiliateNetworkId = undefined;
    }
    
    if (form.publisherPayout && Number(form.publisherPayout) > 0) {
      payload.publisherPayout = Number(form.publisherPayout);
    } else {
      payload.publisherPayout = undefined;
    }
    
    if (form.postbackUrl && form.postbackUrl.trim()) {
      payload.postbackUrl = form.postbackUrl;
    } else {
      payload.postbackUrl = undefined;
    }
    if (task) {
      // For updates, filter out undefined values to avoid NULL overwrites
      const cleanPayload = Object.fromEntries(
        Object.entries({ taskId: task.id, ...payload }).filter(([_, v]) => v !== undefined)
      ) as any;
      updateTask.mutate(cleanPayload);
    } else {
      createTask.mutate(payload);
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-white text-xl font-bold">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Task title..." />
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" placeholder="Task description..." />
          </div>

          {/* Category, Frequency, Difficulty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-background">{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {FREQUENCIES.map(f => <option key={f} value={f} className="bg-background">{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as any }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                {DIFFICULTIES.map(d => <option key={d} value={d} className="bg-background">{d}</option>)}
              </select>
            </div>
          </div>

          {/* Points, XP, Time, Sort */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'points', label: 'Points Reward' },
              { key: 'xpReward', label: 'XP Reward' },
              { key: 'timeMinutes', label: 'Time (min)' },
              { key: 'sortOrder', label: 'Sort Order' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                <input type="number" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" />
              </div>
            ))}
          </div>

          {/* Provider + Main Image URL + Thumbnail URL */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Provider Name</label>
              <input value={form.providerName} onChange={e => setForm(f => ({ ...f, providerName: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Offertoro" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Main Icon / Logo URL</label>
              <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://..." />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Thumbnail URL (for cards)</label>
              <input value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://..." />
            </div>
          </div>

          {/* Offer URL */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Offer / Redirect URL</label>
            <input value={form.offerUrl} onChange={e => setForm(f => ({ ...f, offerUrl: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://example.com/offer" />
            <p className="text-gray-500 text-xs mt-1">Users will be redirected here when they start the task</p>
          </div>

          {/* Main image preview */}
          {form.imageUrl && (
            <div className="flex items-center gap-3 p-3 bg-secondary/40 border border-border rounded-xl">
              <img src={form.imageUrl} alt="Icon preview" className="w-12 h-12 rounded-lg object-cover bg-secondary"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <p className="text-white text-sm font-medium">Icon Preview</p>
                <p className="text-gray-500 text-xs">This image appears on the task card and modal header</p>
              </div>
            </div>
          )}

          {/* Screenshot URLs Manager */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <GripVertical className="w-4 h-4 text-gray-500" />
              <h3 className="text-white text-sm font-semibold">Screenshot Gallery</h3>
              <span className="text-xs text-gray-500 ml-auto">Shown in task detail modal</span>
            </div>
            <ScreenshotManager
              urls={form.screenshots}
              onChange={urls => setForm(f => ({ ...f, screenshots: urls }))}
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Requirements</label>
            <textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" placeholder="What user needs to do to complete this task..." />
          </div>

          {/* Disclaimer */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Disclaimer</label>
            <textarea value={form.disclaimer} onChange={e => setForm(f => ({ ...f, disclaimer: e.target.value }))} rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" placeholder="Legal disclaimer text..." />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
            </button>
            <span className="text-white text-sm">{form.isActive ? 'Active (visible to users)' : 'Inactive (hidden from users)'}</span>
          </div>

          {/* Country Targeting */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Target Countries (empty = show to all)</label>
            <CountryMultiSelect value={form.targetCountries} onChange={v => setForm(f => ({ ...f, targetCountries: v }))} />
            <p className="text-gray-500 text-xs mt-1">Only users from selected countries will see this offer</p>
          </div>

          {/* Device Targeting */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Target Devices (empty = show on all devices)</label>
            <div className="flex gap-2">
              {DEVICES.map(d => (
                <button key={d} type="button"
                  onClick={() => setForm(f => ({ ...f, targetDevices: f.targetDevices.includes(d) ? f.targetDevices.filter(x => x !== d) : [...f.targetDevices, d] }))}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    form.targetDevices.includes(d) ? 'bg-primary text-black border-primary font-semibold' : 'border-border text-gray-400 hover:border-primary/50'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Affiliate Network & Publisher Payout */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-secondary/40 border border-border rounded-xl">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Affiliate Network</label>
              <select value={form.affiliateNetworkId ?? ''} onChange={e => setForm(f => ({ ...f, affiliateNetworkId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                <option value="" className="bg-background">-- Select Network --</option>
                {networks.map((net: any) => (
                  <option key={net.id} value={net.id} className="bg-background">{net.name}</option>
                ))}
              </select>
              <p className="text-gray-500 text-xs mt-1">Which affiliate network this offer is from</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Publisher Payout ($)</label>
              <input type="number" step="0.01" value={form.publisherPayout} onChange={e => setForm(f => ({ ...f, publisherPayout: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="0.00" />
              <p className="text-gray-500 text-xs mt-1">How much you earn per completion</p>
            </div>
          </div>

          {/* Postback URL */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Postback URL (auto-filled from network)</label>
            <input value={form.postbackUrl} onChange={e => setForm(f => ({ ...f, postbackUrl: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="https://network.com/postback" />
            <p className="text-gray-500 text-xs mt-1">Override the default postback URL if needed</p>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
              className="">
              {form.isFeatured ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
            </button>
            <span className="text-white text-sm">{form.isFeatured ? 'Featured (shown in featured section)' : 'Not featured'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isTrending: !f.isTrending }))}
              className="">
              {form.isTrending ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
            </button>
            <span className="text-white text-sm">{form.isTrending ? 'Trending (shown in trending section)' : 'Not trending'}</span>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={isPending}
              className="flex-1 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-secondary text-gray-400 rounded-xl hover:bg-secondary/80 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTasks() {
  const utils = trpc.useUtils();
  const { data: tasks, isLoading } = trpc.admin.tasks.list.useQuery();
  const [modalTask, setModalTask] = useState<any | null | 'new'>(null);
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [order, setOrder] = useState<CategoryId[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CategoryId | null>(null);

  const { data: currentOrder, isLoading: orderLoading } = trpc.admin.categorySectionOrder.get.useQuery();

  const updateOrder = trpc.admin.categorySectionOrder.update.useMutation({
    onSuccess: () => {
      toast.success('Category order updated successfully');
      setIsDirty(false);
      utils.admin.categorySectionOrder.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  React.useEffect(() => {
    if (currentOrder && Array.isArray(currentOrder)) {
      setOrder(currentOrder as CategoryId[]);
    } else if (!orderLoading && !currentOrder) {
      setOrder(allCategories.map(c => c.id));
    }
  }, [currentOrder, orderLoading]);

  const handleDragStart = (id: CategoryId) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: CategoryId) => {
    if (!draggedItem || draggedItem === targetId) return;
    const draggedIndex = order.indexOf(draggedItem);
    const targetIndex = order.indexOf(targetId);
    const newOrder = [...order];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    setOrder(newOrder);
    setIsDirty(true);
    setDraggedItem(null);
  };

  const handleMoveUp = (id: CategoryId) => {
    const index = order.indexOf(id);
    if (index <= 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
    setIsDirty(true);
  };

  const handleMoveDown = (id: CategoryId) => {
    const index = order.indexOf(id);
    if (index >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setOrder(newOrder);
    setIsDirty(true);
  };

  const handleReset = () => {
    setOrder(allCategories.map(c => c.id));
    setIsDirty(true);
  };

  const handleSave = async () => {
    await updateOrder.mutateAsync({ order });
  };

  const deleteTask = trpc.admin.tasks.delete.useMutation({
    onSuccess: () => { toast.success("Task deleted"); utils.admin.tasks.list.invalidate(); }
  });
  const updateTask = trpc.admin.tasks.update.useMutation({
    onMutate: async (variables) => {
      await utils.admin.tasks.list.cancel();
      const prevData = utils.admin.tasks.list.getData();
      if (prevData) {
        utils.admin.tasks.list.setData(undefined, prevData.map((t: any) => {
          if (t.id === variables.taskId) {
            const updated: any = { ...t };
            if (variables.isActive !== undefined) updated.isActive = variables.isActive;
            if (variables.title !== undefined) updated.title = variables.title;
            return updated;
          }
          return t;
        }));
      }
      return { prevData };
    },
    onError: (err, variables, context) => {
      if (context?.prevData) {
        utils.admin.tasks.list.setData(undefined, context.prevData);
      }
      toast.error("Failed to update task");
    },
    onSuccess: () => { toast.success("Task updated"); utils.admin.tasks.list.invalidate(); }
  });

  const filtered = tasks?.filter((t: any) => filter === 'all' || t.category === filter) ?? [];

  return (
    <AdminLayout title="Tasks & Offers" subtitle={`${tasks?.length ?? 0} total tasks`}>
      {(modalTask === 'new' || (modalTask && typeof modalTask === 'object')) && (
        <TaskModal task={modalTask === 'new' ? undefined : modalTask} onClose={() => setModalTask(null)} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="category-order">Category Order</TabsTrigger>
          <TabsTrigger value="postback-tester">Postback Tester</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {['all', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                  filter === cat ? 'bg-primary text-black' : 'bg-secondary text-gray-400 hover:bg-secondary/80')}>
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button onClick={() => setModalTask('new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm flex-shrink-0">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* Table */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["", "Task", "Category", "Points", "XP", "Time", "Frequency", "Difficulty", "Images", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((task: any) => {
                const screenshots = parseScreenshots(task.screenshots);
                return (
                  <tr key={task.id} className="border-b border-border hover:bg-white/[0.02] transition-colors">
                    {/* Icon */}
                    <td className="px-3 py-3 w-12">
                      {task.imageUrl ? (
                        <img src={task.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-secondary" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg">
                          {task.category === 'survey' ? '📊' : task.category === 'video' ? '🎬' : task.category === 'app_trial' ? '📱' : task.category === 'offer' ? '🎯' : task.category === 'daily' ? '🎁' : '👥'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="text-white text-sm font-medium truncate">{task.title}</div>
                      {task.providerName && <div className="text-gray-500 text-xs">{task.providerName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", categoryColors[task.category] ?? 'bg-secondary text-gray-400')}>
                        {task.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-primary font-bold text-sm">{task.points}</td>
                    <td className="px-4 py-3 text-blue-400 text-sm">{task.xpReward}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{task.timeMinutes}m</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-gray-300 capitalize">{task.frequency}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", difficultyColors[task.difficulty] ?? '')}>
                        {task.difficulty}
                      </span>
                    </td>
                    {/* Images count */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {task.imageUrl && (
                          <img src={task.imageUrl} alt="" className="w-6 h-6 rounded object-cover bg-secondary" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        {screenshots.length > 0 && (
                          <span className="text-xs text-gray-400 bg-secondary px-1.5 py-0.5 rounded">+{screenshots.length}</span>
                        )}
                        {!task.imageUrl && screenshots.length === 0 && (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => updateTask.mutate({ taskId: task.id, isActive: !task.isActive })}
                        className={cn("text-xs px-2 py-0.5 rounded-full font-medium transition-all", task.isActive ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400')}>
                        {task.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModalTask(task)}
                          className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate({ taskId: task.id }); }}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">No tasks found for this filter.</div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="category-order" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Section Order</CardTitle>
              <CardDescription>Reorder how offer categories appear on the Missions page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {order.map((categoryId, index) => {
                  const category = allCategories.find(c => c.id === categoryId);
                  if (!category) return null;

                  return (
                    <div
                      key={categoryId}
                      draggable
                      onDragStart={() => handleDragStart(categoryId)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(categoryId)}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-move ${
                        draggedItem === categoryId
                          ? 'border-primary bg-primary/10 opacity-50'
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium">{category.label}</span>
                      </div>

                      <Badge variant="outline" className="flex-shrink-0">
                        #{index + 1}
                      </Badge>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(categoryId)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(categoryId)}
                          disabled={index === order.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || updateOrder.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateOrder.isPending ? 'Saving...' : 'Save Order'}
                </Button>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={!isDirty}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 bg-blue-500/10 border-blue-500/50">
            <CardHeader>
              <CardTitle className="text-blue-400">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">This is the order categories will appear on the Missions page:</p>
              <div className="flex flex-wrap gap-2">
                {order.map((categoryId) => {
                  const category = allCategories.find(c => c.id === categoryId);
                  return (
                    <Badge key={categoryId} variant="secondary" className="gap-1">
                      {category?.label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postback-tester" className="space-y-4">
          <PostbackTester />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
