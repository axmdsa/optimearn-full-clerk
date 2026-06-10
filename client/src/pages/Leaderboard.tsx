import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Trophy, Star, Crown, Medal, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { getInitials } from "@shared/const";

type LeaderboardType = 'alltime' | 'weekly';

const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
const rankBgs = ['bg-yellow-400/15 border-yellow-400/30', 'bg-gray-400/10 border-gray-400/20', 'bg-orange-400/15 border-orange-400/30'];
const rankIcons = [
  <Crown className="w-5 h-5 text-yellow-400" />,
  <Medal className="w-5 h-5 text-gray-300" />,
  <Medal className="w-5 h-5 text-orange-400" />,
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' };
  const colors = ['bg-primary/20 text-primary', 'bg-blue-500/20 text-blue-400', 'bg-purple-500/20 text-purple-400', 'bg-orange-500/20 text-orange-400'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0", sizes[size], colors[colorIndex])}>
      {getInitials(name)}
    </div>
  );
}

export default function Leaderboard() {
  const [type, setType] = useState<LeaderboardType>('alltime');
  const { user } = useAuth();
  const { data: entries, isLoading } = trpc.leaderboard.get.useQuery({ type });

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              LEADER<span className="text-primary">BOARD</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Top earners on OptimEarn</p>
          </div>

          {/* Toggle */}
          <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setType('weekly')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                type === 'weekly' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setType('alltime')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                type === 'alltime' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Time
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse flex gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-1/3" />
                  <div className="h-3 bg-secondary rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd place */}
                <div className={cn("rounded-xl border p-5 text-center flex flex-col items-center gap-3 mt-6", rankBgs[1])}>
                  <span className="text-2xl font-display font-black text-gray-300">#2</span>
                  <Avatar name={top3[1]?.name ?? 'U'} size="lg" />
                  <div>
                    <p className="font-semibold text-sm truncate max-w-[100px]">{top3[1]?.name ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground">Lv. {top3[1]?.level ?? 1}</p>
                  </div>
                  <p className="font-bold text-gray-300">{(top3[1]?.points ?? 0).toLocaleString()} pts</p>
                </div>

                {/* 1st place */}
                <div className={cn("rounded-xl border p-5 text-center flex flex-col items-center gap-3 card-glow-border", rankBgs[0])}>
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <Avatar name={top3[0]?.name ?? 'U'} size="lg" />
                  <div>
                    <p className="font-semibold text-sm truncate max-w-[100px]">{top3[0]?.name ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground">Lv. {top3[0]?.level ?? 1}</p>
                  </div>
                  <p className="font-bold text-yellow-400">{(top3[0]?.points ?? 0).toLocaleString()} pts</p>
                </div>

                {/* 3rd place */}
                <div className={cn("rounded-xl border p-5 text-center flex flex-col items-center gap-3 mt-6", rankBgs[2])}>
                  <span className="text-2xl font-display font-black text-orange-400">#3</span>
                  <Avatar name={top3[2]?.name ?? 'U'} size="lg" />
                  <div>
                    <p className="font-semibold text-sm truncate max-w-[100px]">{top3[2]?.name ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground">Lv. {top3[2]?.level ?? 1}</p>
                  </div>
                  <p className="font-bold text-orange-400">{(top3[2]?.points ?? 0).toLocaleString()} pts</p>
                </div>
              </div>
            )}

            {/* Full List */}
            <div className="space-y-2">
              {entries.map((entry, i) => {
                const isCurrentUser = entry.id === user?.id;
                const rank = i + 1;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all",
                      isCurrentUser
                        ? "bg-primary/10 border-primary/30 card-glow-border"
                        : "bg-card border-border hover:border-primary/20"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn("w-8 text-center font-display font-black text-sm shrink-0",
                      rank <= 3 ? rankColors[rank - 1] : "text-muted-foreground"
                    )}>
                      {rank <= 3 ? rankIcons[rank - 1] : `#${rank}`}
                    </div>

                    {/* Avatar */}
                    <Avatar name={entry.name ?? 'U'} size="md" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-semibold text-sm truncate", isCurrentUser && "text-primary")}>
                          {entry.name ?? 'Anonymous'}
                          {isCurrentUser && <span className="ml-1 text-xs text-primary">(You)</span>}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <p className={cn("font-bold text-sm", rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-orange-400" : "text-foreground")}>
                        {(entry.points ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="font-display font-bold text-lg mb-2">No entries yet</p>
            <p className="text-muted-foreground text-sm">Be the first to earn points and claim the top spot!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
