import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Zap, Gift, Trophy, Users, ShoppingBag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  task_complete: { icon: <Zap className="w-4 h-4" />, color: "text-primary bg-primary/15" },
  reward_redeemed: { icon: <ShoppingBag className="w-4 h-4" />, color: "text-blue-400 bg-blue-400/15" },
  achievement: { icon: <Trophy className="w-4 h-4" />, color: "text-yellow-400 bg-yellow-400/15" },
  referral: { icon: <Users className="w-4 h-4" />, color: "text-purple-400 bg-purple-400/15" },
  system: { icon: <Info className="w-4 h-4" />, color: "text-muted-foreground bg-secondary" },
  bonus: { icon: <Gift className="w-4 h-4" />, color: "text-orange-400 bg-orange-400/15" },
};

interface NotificationsPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

export default function NotificationsPanel({ notifications, onClose }: NotificationsPanelProps) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 animate-spin-in overflow-hidden flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-foreground" />
          <span className="font-display font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors flex-shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Bell className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => {
              const config = typeConfig[n.type] ?? typeConfig.system;
              return (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead.mutate({ id: n.id }); }}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors",
                    !n.isRead && "bg-primary/5"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5 flex-shrink-0">
        <button
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors font-medium py-1"
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
}
