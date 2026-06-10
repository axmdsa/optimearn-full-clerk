import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Zap, Clock, Shield, ChevronRight, Filter,
  ClipboardList, Video, Smartphone, Gift, Users, Layers, Download,
  ChevronLeft, Star, TrendingUp, Flame, Smartphone as PhoneIcon, Tablet, Monitor, ChevronLeft as ScrollLeft, ChevronRight as ScrollRight, Apple,
  Loader, CheckCircle2, Play
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { detectDevice, isDeviceCompatible, getIncompatibleDevices, getDeviceName } from "@/lib/deviceDetection";
import { Copy, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { playOptionalSound, getSoundPreference, setSoundPreference } from "@/lib/soundEffects";

type Category = 'all' | 'survey' | 'video' | 'app_trial' | 'app_install' | 'offer' | 'daily' | 'social' | 'play_to_earn';

const categories: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'all',       label: 'All Offers', icon: <Zap className="w-4 h-4" /> },
  { id: 'daily',     label: 'Daily',        icon: <Gift className="w-4 h-4" /> },
  { id: 'survey',    label: 'Surveys',      icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'video',     label: 'Videos',       icon: <Video className="w-4 h-4" /> },
  { id: 'app_trial', label: 'App Trials',   icon: <Smartphone className="w-4 h-4" /> },
  { id: 'app_install', label: 'App Installs', icon: <Download className="w-4 h-4" /> },
  { id: 'offer',     label: 'Offers',       icon: <Layers className="w-4 h-4" /> },
  { id: 'social',    label: 'Social',       icon: <Users className="w-4 h-4" /> },
  { id: 'play_to_earn', label: 'Play to Earn', icon: <Flame className="w-4 h-4" /> },
];

// Default category order - will be overridden by admin settings
const defaultCategoryOrder: Category[] = ['daily', 'survey', 'video', 'app_trial', 'app_install', 'offer', 'social', 'play_to_earn'];

const difficultyConfig = {
  easy:   { label: 'Easy',   color: 'text-green-400 bg-green-400/15 border-green-400/30' },
  medium: { label: 'Medium', color: 'text-yellow-400 bg-yellow-400/15 border-yellow-400/30' },
  hard:   { label: 'Hard',   color: 'text-red-400 bg-red-400/15 border-red-400/30' },
};

const freqConfig = {
  once:   { label: 'Once',   color: 'badge-once' },
  daily:  { label: 'Daily',  color: 'badge-daily' },
  weekly: { label: 'Weekly', color: 'badge-survey' },
};

const catEmoji: Record<string, string> = {
  survey: '📊', app_trial: '📱', offer: '🎯', video: '🎬', daily: '⚡', social: '👥', play_to_earn: '🎮'
};

// Gradient overlays per category for featured cards
const catGradient: Record<string, string> = {
  survey:    'from-blue-900/80 via-blue-900/40 to-transparent',
  app_trial: 'from-yellow-900/80 via-yellow-900/40 to-transparent',
  offer:     'from-emerald-900/80 via-emerald-900/40 to-transparent',
  video:     'from-purple-900/80 via-purple-900/40 to-transparent',
  daily:     'from-orange-900/80 via-orange-900/40 to-transparent',
  social:    'from-pink-900/80 via-pink-900/40 to-transparent',
  play_to_earn: 'from-red-900/80 via-red-900/40 to-transparent',
};

const catAccent: Record<string, string> = {
  survey:    'text-blue-400 border-blue-400/40 bg-blue-400/10',
  app_trial: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  offer:     'text-primary border-primary/40 bg-primary/10',
  video:     'text-purple-400 border-purple-400/40 bg-purple-400/10',
  daily:     'text-orange-400 border-orange-400/40 bg-orange-400/10',
  social:    'text-pink-400 border-pink-400/40 bg-pink-400/10',
  play_to_earn: 'text-red-400 border-red-400/40 bg-red-400/10',
};

interface Task {
  id: number; title: string; description: string | null; category: string;
  points: number; xpReward: number; timeMinutes: number;
  frequency: string; difficulty: string; providerName: string | null;
  imageUrl: string | null; thumbnailUrl: string | null; screenshots: string | null;
  requirements: string | null; disclaimer: string | null; isFeatured: boolean; isTrending: boolean;
  offerUrl: string | null; targetDevices: string | null;
}

interface UserTask {
  id: number;
  userId: number;
  taskId: number;
  status: 'started' | 'pending' | 'completed' | 'rejected';
  pointsEarned: number;
  createdAt: Date;
}

function parseScreenshots(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Task Icon ────────────────────────────────────────────────────────────────
function getDeviceIcon(devices: string | null) {
  if (!devices) return null;
  try {
    const parsed = JSON.parse(devices);
    const device = parsed[0];
    if (device === 'iOS') return <Apple className="w-4 h-4" />;
    if (device === 'Android') return <PhoneIcon className="w-4 h-4" />;
    if (device === 'PC') return <Monitor className="w-4 h-4" />;
  } catch {}
  return null;
}

function TaskIcon({ task, size = 'md', className }: { task: Task; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [imgErr, setImgErr] = useState(false);
  const sizeClass = size === 'xl' ? 'w-20 h-20 text-5xl' : size === 'lg' ? 'w-16 h-16 text-4xl' : size === 'sm' ? 'w-9 h-9 text-xl' : 'w-12 h-12 text-2xl';
  const roundClass = size === 'xl' || size === 'lg' ? 'rounded-2xl' : 'rounded-xl';

  if (task.imageUrl && !imgErr) {
    return (
      <img
        src={task.imageUrl}
        alt={task.title}
        className={cn(sizeClass, roundClass, "object-cover bg-secondary shrink-0 shadow-lg", className)}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <div className={cn(sizeClass, roundClass, "bg-secondary flex items-center justify-center shrink-0 text-purple-400", className)}>
      {catEmoji[task.category] ?? '🎁'}
    </div>
  );
}

// ─── Screenshot Gallery ───────────────────────────────────────────────────────
function ScreenshotGallery({ screenshots }: { screenshots: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (screenshots.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Screenshots</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {screenshots.map((url, idx) => (
          <button key={idx} onClick={() => setLightbox(idx)} className="shrink-0 w-36 h-24 rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity">
            <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl" onClick={() => setLightbox(null)}>✕</button>
          {lightbox > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              onClick={e => { e.stopPropagation(); setLightbox(l => l! - 1); }}><ChevronLeft className="w-5 h-5" /></button>
          )}
          {lightbox < screenshots.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              onClick={e => { e.stopPropagation(); setLightbox(l => l! + 1); }}><ChevronRight className="w-5 h-5" /></button>
          )}
          <img src={screenshots[lightbox]} alt="Screenshot" className="max-w-full max-h-[85vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{lightbox + 1} / {screenshots.length}</p>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'started' | 'pending' | 'completed' | 'rejected' | null }) {
  if (!status) return null;
  
  const statusConfig = {
    started: {
      label: 'In Progress',
      icon: <Loader className="w-3.5 h-3.5 animate-spin" />,
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    pending: {
      label: 'Pending Verification',
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'bg-green-500/20 text-green-300 border-green-500/40'
    },
    rejected: {
      label: 'Not Qualified',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: 'bg-red-500/20 text-red-300 border-red-500/40'
    }
  };

  const config = statusConfig[status];
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium", config.color)}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, open, onClose, userTasks }: { task: Task | null; open: boolean; onClose: () => void; userTasks: UserTask[] }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [userDevice] = useState(() => detectDevice());
  
  // Get task status from userTasks
  const taskStatus = task ? userTasks.find(ut => ut.taskId === task.id)?.status : null;
  
  const startTask = trpc.tasks.start.useMutation({
    onSuccess: () => {
      toast.success('Task started! Opening in new tab...');
      utils.tasks.myHistory.invalidate();
      // Don't close modal - keep it open
    },
    onError: (e) => toast.error(e.message),
  });

  const handleStartTask = async () => {
    if (!task) return;
    const offerUrl = task.offerUrl;
    startTask.mutate({ taskId: task.id });
    
    // Record click tracking
    if (offerUrl) {
      try {
        const clickResponse = await fetch(
          `/api/tracking/click?task_id=${task.id}&user_id=${task.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrer: window.location.href,
              user_agent: navigator.userAgent,
            }),
          }
        );
        
        if (clickResponse.ok) {
          const clickData = await clickResponse.json();
          const clickId = clickData.click_id;
          
          // Append click ID to offer URL using configured SubID parameter
          const urlWithTracking = new URL(offerUrl);
          // Note: SubID parameter name will be determined by the affiliate network config
          // For now, append as 'click_id' - the postback handler will use the network's configured parameter
          urlWithTracking.searchParams.append('click_id', clickId);
          urlWithTracking.searchParams.append('task_id', task.id.toString());
          
          setTimeout(() => {
            window.open(urlWithTracking.toString(), '_blank');
          }, 100);
        } else {
          // Fallback: open without tracking if click recording fails
          setTimeout(() => {
            window.open(offerUrl, '_blank');
          }, 100);
        }
      } catch (error) {
        console.error('Failed to record click:', error);
        // Fallback: open without tracking
        setTimeout(() => {
          window.open(offerUrl, '_blank');
        }, 100);
      }
    }
  };

  const handleCopyLink = () => {
    if (!task?.offerUrl) return;
    navigator.clipboard.writeText(task.offerUrl);
    toast.success('Link copied!');
  };

  if (!task) return null;
  const diff = difficultyConfig[task.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.easy;
  const screenshots = parseScreenshots(task.screenshots);
  const isCompatible = isDeviceCompatible(userDevice, task.targetDevices);
  const incompatibleDevices = getIncompatibleDevices(userDevice, task.targetDevices);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg w-full p-0 overflow-hidden max-h-[90vh] flex flex-col select-none user-select-none">
        <div className="flex items-center gap-4 p-6 border-b border-border shrink-0">
          <TaskIcon task={task} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="font-display font-bold text-lg leading-tight">{task.title}</h2>
              {taskStatus && <StatusBadge status={taskStatus} />}
            </div>
            {task.providerName && <p className="text-sm text-muted-foreground mt-0.5">by {task.providerName}</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="rewards">
            <TabsList className="w-full rounded-none bg-transparent h-auto p-0 sticky top-0 z-10 bg-card -mb-px -mt-px gap-0">
              <TabsTrigger value="rewards" className="flex-1 rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Rewards</TabsTrigger>
              <TabsTrigger value="details" className="flex-1 rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="rewards" className="p-6 space-y-6 mt-0">
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-3xl font-display font-black text-primary">+{task.points.toLocaleString()} pts</span>
                  <span className="text-muted-foreground text-sm">+{task.xpReward} XP</span>
                </div>
                <p className="text-xs text-muted-foreground">≈ ${(task.points / 1000).toFixed(2)} USD value</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getDeviceIcon(task.targetDevices) && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                    {getDeviceIcon(task.targetDevices)}
                  </span>
                )}
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", diff.color)}>{diff.label}</span>
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", freqConfig[task.frequency as keyof typeof freqConfig]?.color ?? 'badge-once')}>
                  {freqConfig[task.frequency as keyof typeof freqConfig]?.label ?? task.frequency}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{task.timeMinutes} min
                </span>
              </div>
              {task.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
                </div>
              )}
              <ScreenshotGallery screenshots={screenshots} />
            </TabsContent>
            <TabsContent value="details" className="p-6 space-y-5 mt-0">
              {task.requirements && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements</p>
                  <p className="text-sm text-foreground leading-relaxed">{task.requirements}</p>
                </div>
              )}
              {!task.requirements && <ScreenshotGallery screenshots={screenshots} />}
              {task.disclaimer && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disclaimer</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.disclaimer}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="p-6 border-t border-border shrink-0 space-y-3">
          {!isCompatible && incompatibleDevices.length > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 flex gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-50 mb-2">Available on {incompatibleDevices.join(' or ')}</p>
                <p className="text-xs text-amber-100/80 mb-3">Open this offer on a compatible device to get started.</p>
                <div className="flex items-center gap-2">
                  <Button onClick={handleCopyLink} size="sm" variant="ghost" className="text-xs h-8 px-2 text-amber-200 hover:text-amber-100 hover:bg-amber-500/20">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <code className="text-xs bg-amber-500/10 px-2 py-1 rounded text-amber-100 font-mono truncate">{window.location.href}</code>
                </div>
              </div>
            </div>
          )}
          {isAuthenticated ? (
            <Button onClick={handleStartTask} disabled={startTask.isPending || (!isCompatible && taskStatus !== 'started')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 text-base glow-green-sm">
              {startTask.isPending ? 'Starting...' : 'Start Task'}
            </Button>
          ) : (
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 text-base" asChild>
              <a href={getLoginUrl()}>Sign In to Start</a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Featured Card (large hero card) ─────────────────────────────────────────
function FeaturedCard({ task, rank, onClick, userTasks = [] }: { task: Task; rank: number; onClick: () => void; userTasks?: UserTask[] }) {
  const [imgErr, setImgErr] = useState(false);
  const gradient = catGradient[task.category] ?? 'from-gray-900/80 via-gray-900/40 to-transparent';
  const accent = catAccent[task.category] ?? 'text-primary border-primary/40 bg-primary/10';
  const screenshots = parseScreenshots(task.screenshots);
  const bgImage = screenshots[0] ?? null;
  const taskStatus = userTasks.find(ut => ut.taskId === task.id)?.status ?? null;

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-orange-500/75 transition-all duration-200 hover:border-orange-400 glow-orange-dark-neon"
      style={{ minHeight: 200 }}
    >
      {/* Background — first screenshot or gradient fill */}
      {bgImage && !imgErr ? (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/60 to-background" />
      )}

      {/* Dark overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-t", gradient)} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col justify-between h-full" style={{ minHeight: 200 }}>
        {/* Top row: badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hot badge */}
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="w-3 h-3" /> HOT
            </span>
            {/* Featured badge */}
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <Star className="w-3 h-3 fill-yellow-400" /> FEATURED
            </span>
            {/* Category badge */}
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border capitalize", accent)}>
              {task.category.replace('_', ' ')}
            </span>
          </div>
          {/* Rank indicator */}
          <div className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-xs font-bold text-white/70 shrink-0">
            #{rank}
          </div>
        </div>

        {/* Bottom row: icon + info + CTA */}
        <div className="flex items-end gap-4 mt-6">
          {/* Icon */}
          <div className="shrink-0">
            <TaskIcon task={task} size="xl" className="shadow-2xl ring-2 ring-white/10" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg mb-2">
              {task.title}
            </p>
            {task.providerName && (
              <p className="text-white/60 text-xs mb-2">by {task.providerName}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-primary font-black text-lg drop-shadow-lg">
                +{task.points.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* CTA or Status */}
          {taskStatus === 'started' ? (
            <div className="shrink-0">
              <StatusBadge status={taskStatus} />
            </div>
          ) : (
            <Button
              size="sm"
              className="shrink-0 bg-primary text-black font-bold hover:bg-primary/90 glow-green-sm shadow-lg"
              onClick={e => { e.stopPropagation(); onClick(); }}
            >
              Start <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trending Card (Top 5 Highest Paying) ────────────────────────────────────
function TrendingCard({ task, onClick, userTasks = [] }: { task: Task; onClick: () => void; userTasks?: UserTask[] }) {
  const [imgErr, setImgErr] = useState(false);
  const thumbnailUrl = task.thumbnailUrl || task.imageUrl;
  const deviceIcon = getDeviceIcon(task.targetDevices);
  const taskStatus = userTasks.find(ut => ut.taskId === task.id)?.status ?? null;

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-72 bg-card border-2 border-yellow-300/80 rounded-2xl overflow-hidden hover:border-yellow-200 transition-all duration-200 cursor-pointer group flex flex-col glow-yellow-orange-light"
    >
      {/* Large Thumbnail Image */}
      {thumbnailUrl && !imgErr ? (
        <div className="w-full h-48 bg-secondary overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={task.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-secondary flex items-center justify-center text-4xl">
          {catEmoji[task.category] ?? '🎁'}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title with Device Icon */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-display font-bold text-base leading-tight line-clamp-2 flex-1">{task.title}</p>
          {deviceIcon && (
            <div className="text-primary shrink-0 mt-0.5">
              {deviceIcon}
            </div>
          )}
        </div>

        {/* Points Display */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary font-black text-2xl">+{task.points.toLocaleString()}</span>
          <span className="text-muted-foreground text-xs">points</span>
        </div>

        {/* CTA Button or Status */}
        {taskStatus === 'started' ? (
          <div className="w-full">
            <StatusBadge status={taskStatus} />
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full bg-primary text-black font-bold hover:bg-primary/90 glow-green-sm transition-all"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            Start and earn {task.points.toLocaleString()} points
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Regular Task Card ────────────────────────────────────────────────────────
function TaskCard({ task, onClick, isHighestPaying = false, isFeatured = false, userTasks = [] }: { task: Task; onClick: () => void; isHighestPaying?: boolean; isFeatured?: boolean; userTasks?: UserTask[] }) {
  const diff = difficultyConfig[task.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.easy;
  const freq = freqConfig[task.frequency as keyof typeof freqConfig];
  const screenshots = parseScreenshots(task.screenshots);
  const borderClass = getCardBorderClass(task, isFeatured, isHighestPaying);
  const taskStatus = userTasks.find(ut => ut.taskId === task.id)?.status ?? null;

  return (
    <div onClick={onClick}
      className={cn("bg-card rounded-lg overflow-hidden hover:bg-card/80 transition-all duration-150 cursor-pointer group", borderClass)}>
      {task.imageUrl && (
        <div className="w-full h-20 bg-secondary overflow-hidden rounded-t-lg">
          <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <TaskIcon task={task} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs leading-tight line-clamp-2">{task.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
          <span className="text-primary font-bold">+{(task.points / 1000).toFixed(1)}k</span>
          <span className={cn("px-1.5 py-0.5 rounded-full border font-medium text-xs", diff.color)}>{diff.label}</span>
          <span className="text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.timeMinutes}m</span>
        </div>
        {taskStatus === 'started' ? (
          <div className="w-full">
            <StatusBadge status={taskStatus} />
          </div>
        ) : (
          <Button size="sm" className="w-full h-6 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 text-xs font-semibold transition-all">
            Start
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Trending Carousel Component ─────────────────────────────────────────────
function TrendingCarousel({ trending, onSelectTask, userTasks = [] }: { trending: Task[]; onSelectTask: (task: Task) => void; userTasks?: UserTask[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
        <div className="flex gap-4">
          {/* Render trending cards without duplication */}
          {trending.map((task, idx) => (
            <TrendingCard key={`${task.id}-${idx}`} task={task} onClick={() => onSelectTask(task)} userTasks={userTasks} />
          ))}
        </div>
      </div>
      {/* Scroll Controls */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-primary/80 hover:bg-primary text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
      >
        <ScrollLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-primary/80 hover:bg-primary text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
      >
        <ScrollRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────────────
function getCardBorderClass(task: Task, isFeatured: boolean, isHighestPaying: boolean): string {
  if (isHighestPaying) {
    return 'border-2 border-yellow-300/80 hover:border-yellow-200 glow-yellow-orange-light';
  } else if (isFeatured) {
    return 'border-2 border-orange-500/75 hover:border-orange-400 glow-orange-dark-neon';
  } else {
    return 'border-2 border-white/15 hover:border-primary/30';
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FEATURED_THRESHOLD = 500; // tasks with >= 500 pts are featured

export default function Missions() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<'iOS' | 'Android' | 'PC' | null>(null);
  const { user } = useAuth();
  const [userDevice] = useState(() => detectDevice());
  const { data: allTasks, isLoading } = trpc.tasks.list.useQuery({ category: 'all', country: user?.country ?? undefined });
  const { data: userTasks = [] } = trpc.tasks.myHistory.useQuery(undefined, { refetchInterval: 5000 });
  const { data: categorySectionOrder } = trpc.admin.categorySectionOrder.get.useQuery();
  
  // Track previous userTasks to detect completions
  const prevUserTasksRef = useRef<UserTask[]>([]);
  useEffect(() => {
    const newlyCompleted = userTasks.filter(ut => {
      const prev = prevUserTasksRef.current.find(p => p.taskId === ut.taskId);
      return ut.status === 'completed' && (!prev || prev.status !== 'completed');
    });
    
    newlyCompleted.forEach(ut => {
      const task = allTasks?.find(t => t.id === ut.taskId);
      if (task) {
        playOptionalSound();
        toast.success(
          <div className="flex items-center justify-between gap-3">
            <span>🎉 {task.title} completed! +{task.points} pts</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 px-2"
              onClick={() => {
                setSelectedTask(task);
                toast.dismiss();
              }}
            >
              View Details
            </Button>
          </div>,
          { duration: 5000 }
        );
      }
    });
    
    prevUserTasksRef.current = userTasks;
  }, [userTasks, allTasks]);
  
  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      toast.success('Task completed! Points added to your account.');
      setShowProofModal(false);
      setTaskToComplete(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Split into featured (manually marked) and regular
  // Featured offers are NOT filtered by device - always show all featured
  const featured = (allTasks ?? [])
    .filter((t: any) => t.isFeatured)
    .sort((a: any, b: any) => {
      const aCompatible = isDeviceCompatible(userDevice, a.targetDevices);
      const bCompatible = isDeviceCompatible(userDevice, b.targetDevices);
      if (aCompatible === bCompatible) return b.points - a.points;
      return aCompatible ? -1 : 1;
    })
    .slice(0, 3) as Task[];

  const filtered = (allTasks ?? []).filter((t: any) => {
    // Filter by category
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    // Filter by device if selected
    if (selectedDevice) {
      try {
        const devices = t.targetDevices ? JSON.parse(t.targetDevices) : [];
        if (!devices.includes(selectedDevice)) return false;
      } catch {
        return false;
      }
    }
    return true;
  }) as Task[];

  // For the regular grid, exclude featured tasks when viewing "all" to avoid duplication
  // Trending tasks should still appear in the grid even if they're in the Trending section
  // Sort by device compatibility: compatible first, then incompatible
  const regularTasks = (activeCategory === 'all'
    ? filtered.filter((t: Task) => !t.isFeatured)
    : filtered).sort((a: Task, b: Task) => {
      const aCompatible = isDeviceCompatible(userDevice, a.targetDevices);
      const bCompatible = isDeviceCompatible(userDevice, b.targetDevices);
      if (aCompatible === bCompatible) return b.points - a.points; // Same compatibility, sort by points
      return aCompatible ? -1 : 1; // Compatible first
    });

  // Trending: top 5 highest paying tasks (excludes featured), NO device filtering
  // Trending offers show highest payout regardless of device compatibility
  // Filter by isTrending flag (admin-marked trending offers)
  const trending = (allTasks ?? [])
    .filter((t: Task) => t.isTrending && !t.isFeatured)
    .sort((a: Task, b: Task) => b.points - a.points)
    .slice(0, 5) as Task[];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">
              EARNING <span className="text-primary">CENTER</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {allTasks?.length ?? 0} offers available
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hidden sm:flex">
            <Filter className="w-4 h-4 mr-2" />
            Show Completed
          </Button>
        </div>



        {/* ── FEATURED SECTION ── shown only on "all" tab and when NO device filter is selected */}
        {activeCategory === 'all' && !isLoading && featured.length > 0 && !selectedDevice && (
          <section className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-400" />
                <h2 className="font-display font-bold text-lg text-white">
                  Featured <span className="text-purple-400">Offers</span>
                </h2>
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                Top {featured.length} highest paying
              </span>
            </div>

            {/* Featured grid — 1 large + 2 smaller, or up to 3 equal */}
            {featured.length === 1 ? (
              <FeaturedCard task={featured[0]} rank={1} onClick={() => setSelectedTask(featured[0])} userTasks={userTasks} />
            ) : featured.length === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featured.map((t, i) => (
                  <FeaturedCard key={t.id} task={t} rank={i + 1} onClick={() => setSelectedTask(t)} userTasks={userTasks} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* First card spans 2 columns on large screens */}
                <div className="lg:col-span-2">
                  <FeaturedCard task={featured[0]} rank={1} onClick={() => setSelectedTask(featured[0])} userTasks={userTasks} />
                </div>
                <div className="flex flex-col gap-4">
                  {featured.slice(1, 3).map((t, i) => (
                    <FeaturedCard key={t.id} task={t} rank={i + 2} onClick={() => setSelectedTask(t)} userTasks={userTasks} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── TRENDING NOW SECTION ── shown only on "all" tab and when NO device filter is selected */}
        {activeCategory === 'all' && !isLoading && trending.length > 0 && !selectedDevice && (
          <section className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h2 className="font-display font-bold text-lg text-white">
                  Trending <span className="text-purple-400">Offers</span>
                </h2>
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                Top {trending.length} offers
              </span>
            </div>

            {/* Auto-scrolling Trending Carousel with Manual Controls */}
            <TrendingCarousel trending={trending} onSelectTask={setSelectedTask} userTasks={userTasks} />
          </section>
        )}

        {/* ── CATEGORY FILTERS ── */}
        <div className="flex gap-2 flex-wrap mb-6 items-center">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary glow-green-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              )}>
              {cat.icon}
              {cat.label}
              {cat.id === 'all' && allTasks && (
                <span className={cn("text-xs rounded-full px-1.5 py-0.5 font-bold",
                  activeCategory === 'all' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {allTasks.length}
                </span>
              )}
            </button>
          ))}
          {/* Device Filter Separator */}
          <div className="h-6 w-px bg-border" />
          {/* Device Filter with Icons */}
          {['iOS', 'Android', 'PC'].map((device) => {
            const getDeviceIcon = (d: string) => {
              if (d === 'iOS') return <Apple className="w-3.5 h-3.5" />;
              if (d === 'Android') return <PhoneIcon className="w-3.5 h-3.5" />;
              if (d === 'PC') return <Monitor className="w-3.5 h-3.5" />;
              return null;
            };
            return (
              <Button
                key={device}
                variant={selectedDevice === device ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDevice(selectedDevice === device ? null : (device as any))}
                className="text-xs flex items-center gap-1.5"
              >
                {getDeviceIcon(device)}
                {device}
              </Button>
            );
          })}
        </div>



        {/* ── CATEGORY SECTIONS (Mobile & Desktop) ── */}
        {activeCategory === 'all' && !isLoading && (
          <>
            {(() => {
              // Get the ordered categories based on admin settings, or use default order
              const defaultOrder = categories.filter((c: any) => c.id !== 'all').map((c: any) => c.id);
              const orderedCategoryIds = (categorySectionOrder && Array.isArray(categorySectionOrder) && categorySectionOrder.length > 0) ? categorySectionOrder : defaultOrder;
              const orderedCategories = orderedCategoryIds
                .map((id: string) => categories.find((c: any) => c.id === id))
                .filter((cat: any): cat is typeof categories[0] => cat !== undefined);
              return orderedCategories;
            })().map((cat: any) => {
              const categoryTasks = (allTasks ?? []).filter((t: Task) => {
                if (t.category !== cat.id) return false;
                // Filter by device if selected
                if (selectedDevice) {
                  try {
                    const devices = t.targetDevices ? JSON.parse(t.targetDevices) : [];
                    if (!devices.includes(selectedDevice)) return false;
                  } catch {
                    return false;
                  }
                }
                return true;
              }).sort((a: Task, b: Task) => {
                const aCompatible = isDeviceCompatible(userDevice, a.targetDevices);
                const bCompatible = isDeviceCompatible(userDevice, b.targetDevices);
                if (aCompatible === bCompatible) return b.points - a.points;
                return aCompatible ? -1 : 1;
              });
              if (categoryTasks.length === 0) return null;
              return (
                <section key={cat.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {cat.icon}
                    <h2 className="font-display font-bold text-sm text-white">{cat.label}</h2>
                    <div className="flex-1" />
                    <a href={`/category/${cat.id}`} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">View All →</a>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categoryTasks.map((task: Task) => (
                      <MobileOfferCard key={task.id} task={task} isTrending={cat.id === 'play_to_earn'} onClick={() => setSelectedTask(task)} userTasks={userTasks} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {/* ── ALL MISSIONS GRID ── */}
        {activeCategory !== 'all' && (
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display font-bold text-base text-white capitalize">
              {activeCategory.replace('_', ' ')} <span className="text-primary">Offers</span>
            </h2>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{filtered.length} available</span>
          </div>
        )}
        {activeCategory === 'all' && regularTasks.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display font-bold text-base text-white">
              All <span className="text-primary">Offers</span>
            </h2>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{regularTasks.length} available</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-3/4" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (activeCategory === 'all' ? regularTasks : filtered).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {(activeCategory === 'all' ? regularTasks : filtered).map((task) => {
              const isHighestPaying = trending.some(t => t.id === task.id);
              return (
                <TaskCard key={task.id} task={task} isHighestPaying={isHighestPaying} isFeatured={task.isFeatured} onClick={() => setSelectedTask(task)} userTasks={userTasks} />
              );
            })}
          </div>
        ) : activeCategory !== 'all' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="font-display font-bold text-lg mb-2">No offers in this category</p>
            <p className="text-muted-foreground text-sm">Check back soon for new offers!</p>
          </div>
        ) : null}
      </div>

      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} userTasks={userTasks} />
      <TaskCompletionProofModal
        task={taskToComplete}
        open={showProofModal}
        onClose={() => { setShowProofModal(false); setTaskToComplete(null); }}
        onSubmit={async (proofType, proofUrl, proofCode) => {
          if (!taskToComplete) return;
          await completeTask.mutateAsync({
            taskId: taskToComplete.id,
            proofType: proofType as any,
            proofUrl,
            proofCode,
          });
        }}
      />
    </AppLayout>
  );
}


// ─── Task Completion Proof Modal ──────────────────────────────────────
function TaskCompletionProofModal({ task, open, onClose, onSubmit }: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (proofType: string, proofUrl?: string, proofCode?: string) => Promise<void>;
}) {
  const [proofType, setProofType] = useState<'screenshot' | 'code' | 'none'>('none');
  const [proofUrl, setProofUrl] = useState('');
  const [proofCode, setProofCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProofUrl(url);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(proofType, proofUrl, proofCode);
      setProofType('none');
      setProofUrl('');
      setProofCode('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-display font-bold text-lg">Submit Proof of Completion</h2>
            <p className="text-sm text-muted-foreground mt-1">for "{task.title}"</p>
          </div>

          <RadioGroup value={proofType} onValueChange={(v) => setProofType(v as any)}>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/40 cursor-pointer">
              <RadioGroupItem value="none" id="proof-none" />
              <Label htmlFor="proof-none" className="flex-1 cursor-pointer">
                <span className="font-medium">No Proof Required</span>
                <p className="text-xs text-muted-foreground">Complete immediately</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/40 cursor-pointer">
              <RadioGroupItem value="screenshot" id="proof-screenshot" />
              <Label htmlFor="proof-screenshot" className="flex-1 cursor-pointer">
                <span className="font-medium">Screenshot</span>
                <p className="text-xs text-muted-foreground">Upload proof image</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/40 cursor-pointer">
              <RadioGroupItem value="code" id="proof-code" />
              <Label htmlFor="proof-code" className="flex-1 cursor-pointer">
                <span className="font-medium">Confirmation Code</span>
                <p className="text-xs text-muted-foreground">Enter code from task</p>
              </Label>
            </div>
          </RadioGroup>

          {proofType === 'screenshot' && (
            <div className="space-y-3">
              <Label>Upload Screenshot</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {proofUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary">
                  <img src={proofUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {proofType === 'code' && (
            <div className="space-y-3">
              <Label>Confirmation Code</Label>
              <Input
                placeholder="Enter the code from the task"
                value={proofCode}
                onChange={(e) => setProofCode(e.target.value)}
                maxLength={255}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (proofType === 'screenshot' && !proofUrl) || (proofType === 'code' && !proofCode)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Submitting...' : 'Complete Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Mobile Offer Card (Horizontal Scroll) ────────────────────────────────────
function MobileOfferCard({ task, onClick, isTrending = false, userTasks = [] }: { task: Task; onClick: () => void; isTrending?: boolean; userTasks?: UserTask[] }) {
  const diff = difficultyConfig[task.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.easy;
  const borderClass = isTrending ? 'border-2 border-orange-500/75 hover:border-orange-400 glow-orange-dark-neon' : 'border-2 border-white/15 hover:border-primary/50';
  const shadowClass = isTrending ? 'hover:shadow-orange-500/20' : 'hover:shadow-primary/20';
  const taskStatus = userTasks.find(ut => ut.taskId === task.id)?.status ?? null;


  return (
    <div
      onClick={onClick}
      className={cn("flex-shrink-0 w-40 bg-gradient-to-br from-card to-card/80 border rounded-lg p-3 transition-all duration-150 cursor-pointer group hover:shadow-lg", borderClass, shadowClass)}
    >
      {/* Icon + Points */}
      <div className="flex items-start justify-between mb-2">
        <TaskIcon task={task} size="sm" />
        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
          +{(task.points / 1000).toFixed(1)}k
        </span>
      </div>

      {/* Title */}
      <p className="font-semibold text-xs leading-tight line-clamp-2 mb-2">{task.title}</p>

      {/* Difficulty Badge */}
      <span className={cn("text-xs px-1.5 py-0.5 rounded-full border font-medium inline-block mb-2", diff.color)}>
        {diff.label}
      </span>

      {/* Time */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Clock className="w-3 h-3" />
        <span>{task.timeMinutes}m</span>
      </div>

      {/* CTA Button or Status */}
      {taskStatus === 'started' ? (
        <div className="w-full">
          <StatusBadge status={taskStatus} />
        </div>
      ) : (
        <Button
          size="sm"
          className="w-full h-7 text-xs bg-primary text-black font-bold hover:bg-primary/90 glow-green-sm"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          Start
        </Button>
      )}
    </div>
  );
}
