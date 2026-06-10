import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Zap, Gift, Trophy, Users, ShoppingBag, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

type NotificationType = 'task_complete' | 'reward_redeemed' | 'achievement' | 'referral' | 'system' | 'bonus';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string; label: string }> = {
  task_complete: { icon: <Zap className="w-5 h-5" />, color: "text-primary bg-primary/15", label: "Task Completed" },
  reward_redeemed: { icon: <ShoppingBag className="w-5 h-5" />, color: "text-blue-400 bg-blue-400/15", label: "Reward Redeemed" },
  achievement: { icon: <Trophy className="w-5 h-5" />, color: "text-yellow-400 bg-yellow-400/15", label: "Achievement" },
  referral: { icon: <Users className="w-5 h-5" />, color: "text-purple-400 bg-purple-400/15", label: "Referral" },
  system: { icon: <Info className="w-5 h-5" />, color: "text-muted-foreground bg-secondary", label: "System" },
  bonus: { icon: <Gift className="w-5 h-5" />, color: "text-orange-400 bg-orange-400/15", label: "Bonus" },
};

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No notifications yet</h2>
            <p className="text-muted-foreground">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type] ?? typeConfig.system;
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      markRead.mutate({ id: notification.id });
                    }
                  }}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-lg border border-border transition-colors text-left",
                    !notification.isRead
                      ? "bg-primary/5 hover:bg-primary/10 border-primary/20"
                      : "bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5", config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
