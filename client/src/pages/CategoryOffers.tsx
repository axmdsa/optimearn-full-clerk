import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Zap, Clock, Shield, ChevronRight, Filter,
  ClipboardList, Video, Smartphone, Gift, Users, Layers,
  ChevronLeft, Star, TrendingUp, Flame, Smartphone as PhoneIcon, Tablet, Monitor, ChevronLeft as ScrollLeft, ChevronRight as ScrollRight, Apple
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import { detectDevice, isDeviceCompatible, getIncompatibleDevices } from "@/lib/deviceDetection";
import { Copy, AlertCircle } from "lucide-react";

type Category = 'survey' | 'video' | 'app_trial' | 'offer' | 'daily' | 'social' | 'play_to_earn';

const categories: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'daily',     label: 'Daily',        icon: <Gift className="w-4 h-4" /> },
  { id: 'survey',    label: 'Surveys',      icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'video',     label: 'Videos',       icon: <Video className="w-4 h-4" /> },
  { id: 'app_trial', label: 'App Trials',   icon: <Smartphone className="w-4 h-4" /> },
  { id: 'offer',     label: 'Offers',       icon: <Layers className="w-4 h-4" /> },
  { id: 'social',    label: 'Social',       icon: <Users className="w-4 h-4" /> },
  { id: 'play_to_earn', label: 'Play to Earn', icon: <Flame className="w-4 h-4" /> },
];

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

interface Task {
  id: number; title: string; description: string | null; category: string;
  points: number; xpReward: number; timeMinutes: number;
  frequency: string; difficulty: string; providerName: string | null;
  imageUrl: string | null; thumbnailUrl: string | null; screenshots: string | null;
  requirements: string | null; disclaimer: string | null; isFeatured: boolean;
  offerUrl: string | null; targetDevices: string | null;
}

function parseScreenshots(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

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

function TaskDetailModal({ task, open, onClose }: { task: Task | null; open: boolean; onClose: () => void }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [userDevice] = useState(() => detectDevice());
  const startTask = trpc.tasks.start.useMutation({
    onSuccess: () => {
      toast.success('Task started! Opening in new tab...');
      utils.tasks.myHistory.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleStartTask = () => {
    if (!task) return;
    const offerUrl = task.offerUrl;
    startTask.mutate({ taskId: task.id });
    if (offerUrl) {
      setTimeout(() => {
        window.open(offerUrl, '_blank');
      }, 100);
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
      <DialogContent className="bg-card border-border max-w-lg w-full p-0 overflow-hidden flex flex-col md:max-h-[90vh] max-h-screen md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%] top-12 left-0 !translate-x-0 !translate-y-0 rounded-none md:rounded-lg [&_[data-slot='dialog-close']_svg]:size-5 md:[&_[data-slot='dialog-close']_svg]:size-4">
        <div className="flex items-center gap-4 p-6 border-b border-border shrink-0">
          <TaskIcon task={task} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg leading-tight">{task.title}</h2>
            {task.providerName && <p className="text-sm text-muted-foreground mt-0.5">by {task.providerName}</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="rewards">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 sticky top-0 z-10 bg-card">
              <TabsTrigger value="rewards" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3">Rewards</TabsTrigger>
              <TabsTrigger value="details" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3">Details</TabsTrigger>
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
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", difficultyConfig[task.difficulty as keyof typeof difficultyConfig]?.color ?? difficultyConfig.easy.color)}>{difficultyConfig[task.difficulty as keyof typeof difficultyConfig]?.label ?? task.difficulty}</span>
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
            <Button onClick={handleStartTask} disabled={startTask.isPending || !isCompatible}
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

function getCardBorderClass(task: Task, isHighestPaying: boolean): string {
  if (isHighestPaying) {
    return 'border-2 border-yellow-300/80 hover:border-yellow-200 glow-yellow-orange-light';
  }
  if (task.isFeatured) {
    return 'border-2 border-orange-500/75 hover:border-orange-400 glow-orange-dark-neon';
  }
  return 'border-2 border-white/15 hover:border-primary/30';
}

// Desktop card with thumbnail
function DesktopTaskCard({ task, isHighestPaying, onClick }: { task: Task; isHighestPaying?: boolean; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const borderClass = getCardBorderClass(task, isHighestPaying ?? false);
  const diff = difficultyConfig[task.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.easy;

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
        <Button size="sm" className="w-full h-6 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 text-xs font-semibold transition-all">
          Start
        </Button>
      </div>
    </div>
  );
}

// Mobile card (matches MobileOfferCard from Missions)
function MobileOfferCard({ task, onClick, isTrending = false }: { task: Task; onClick: () => void; isTrending?: boolean }) {
  const diff = difficultyConfig[task.difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.easy;
  const borderClass = isTrending ? 'border-2 border-orange-500/75 hover:border-orange-400 glow-orange-dark-neon' : 'border-2 border-white/15 hover:border-primary/50';
  const shadowClass = isTrending ? 'hover:shadow-orange-500/20' : 'hover:shadow-primary/20';

  return (
    <div
      onClick={onClick}
      className={cn("flex-shrink-0 w-36 bg-gradient-to-br from-card to-card/80 border rounded-lg p-2.5 transition-all duration-150 cursor-pointer group hover:shadow-lg", borderClass, shadowClass)}
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

      {/* CTA Button */}
      <Button
        size="sm"
        className="w-full h-7 text-xs bg-primary text-black font-bold hover:bg-primary/90 glow-green-sm"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        Start
      </Button>
    </div>
  );
}

export default function CategoryOffers({ params }: { params: { category: Category } }) {
  const [, setLocation] = useLocation();
  const categoryId = params.category as Category;
  const categoryInfo = categories.find(c => c.id === categoryId);
  const [userDevice] = useState(() => detectDevice());
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<'iOS' | 'Android' | 'PC' | null>(null);
  const { user } = useAuth();
  
  const { data: allTasks, isLoading } = trpc.tasks.list.useQuery({ category: 'all', country: user?.country ?? undefined });

  // Filter tasks by category
  const categoryTasks = (allTasks ?? []).filter((t: Task) => t.category === categoryId) as Task[];

  // Sort by compatibility: compatible offers first, then incompatible
  const sortedCategoryTasks = [...categoryTasks].sort((a: Task, b: Task) => {
    const aCompatible = isDeviceCompatible(userDevice, a.targetDevices);
    const bCompatible = isDeviceCompatible(userDevice, b.targetDevices);
    if (aCompatible === bCompatible) return b.points - a.points; // Same compatibility, sort by points
    return aCompatible ? -1 : 1; // Compatible first
  });

  // Trending: top 5 high-paying tasks by points (excludes featured), sorted by compatibility
  const trending = (allTasks ?? [])
    .filter((t: Task) => !t.isFeatured)
    .sort((a: Task, b: Task) => {
      const aCompatible = isDeviceCompatible(userDevice, a.targetDevices);
      const bCompatible = isDeviceCompatible(userDevice, b.targetDevices);
      if (aCompatible === bCompatible) return b.points - a.points;
      return aCompatible ? -1 : 1;
    })
    .slice(0, 5) as Task[];

  if (!categoryInfo) {
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-2">Category not found</p>
            <Button onClick={() => setLocation('/missions')}>Back to Missions</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation('/missions')} className="p-0 h-auto">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display text-3xl font-bold">
                {categoryInfo.label} <span className="text-primary">Offers</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {categoryTasks.length} offers available
            </p>
          </div>
        </div>

        {/* Device Filter */}
        <div className="flex gap-2 mb-6 items-center">
          {['iOS', 'Android', 'PC'].map((device) => {
            const getDeviceIconFn = (d: string) => {
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
                {getDeviceIconFn(device)}
                {device}
              </Button>
            );
          })}
        </div>

        {/* Offers Grid - Desktop and Mobile */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
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
        ) : categoryTasks.length > 0 ? (
          <div className="hidden md:grid grid-cols-4 gap-3">
            {sortedCategoryTasks.map((task) => {
              const isHighestPaying = trending.some(t => t.id === task.id);
              return (
                <DesktopTaskCard key={task.id} task={task} isHighestPaying={isHighestPaying} onClick={() => setSelectedTask(task)} />
              );
            })}
          </div>
        ) : null}

        {/* Mobile Grid - 3 columns */}
        {sortedCategoryTasks.length > 0 && (
          <div className="md:hidden grid grid-cols-3 gap-2">
            {sortedCategoryTasks.map((task) => (
              <MobileOfferCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && categoryTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="font-display font-bold text-lg mb-2">No offers in this category</p>
            <p className="text-muted-foreground text-sm">Check back soon for new offers!</p>
          </div>
        )}
      </div>

      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </AppLayout>
  );
}
