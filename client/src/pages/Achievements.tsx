import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, Lock, CheckCircle2, Star, Zap, Trophy } from "lucide-react";

const rarityConfig = {
  common:    { label: 'Common',    color: 'text-gray-400 bg-gray-400/10 border-gray-400/20', glow: '' },
  rare:      { label: 'Rare',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', glow: 'shadow-blue-500/20' },
  epic:      { label: 'Epic',      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', glow: 'shadow-purple-500/20' },
  legendary: { label: 'Legendary', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', glow: 'shadow-yellow-500/30' },
};

interface Achievement {
  id: number; name: string; description: string | null; icon: string;
  rarity: string; pointsBonus: number;
  unlockedAt?: Date | null;
}

function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const rarity = rarityConfig[achievement.rarity as keyof typeof rarityConfig] ?? rarityConfig.common;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 flex flex-col items-center text-center transition-all duration-200",
      unlocked
        ? `border-border hover:border-primary/30 shadow-lg ${rarity.glow}`
        : "border-border/50 opacity-60 grayscale"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 transition-all",
        unlocked ? "bg-secondary" : "bg-secondary/50"
      )}>
        {unlocked ? achievement.icon : <Lock className="w-6 h-6 text-muted-foreground/40" />}
      </div>

      {/* Rarity badge */}
      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium mb-2", rarity.color)}>
        {rarity.label}
      </span>

      <h3 className={cn("font-display font-bold text-sm mb-1", !unlocked && "text-muted-foreground")}>
        {achievement.name}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{achievement.description}</p>

      {/* Rewards */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-primary">
          <Star className="w-3 h-3" />{achievement.pointsBonus} pts
        </span>
      </div>

      {/* Unlocked date */}
      {unlocked && achievement.unlockedAt && (
        <div className="mt-3 flex items-center gap-1 text-xs text-primary">
          <CheckCircle2 className="w-3 h-3" />
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default function Achievements() {
  const { data: allAchievements, isLoading: loadingAll } = trpc.achievements.list.useQuery();
  const { data: userAchievements, isLoading: loadingUser } = trpc.achievements.mine.useQuery();

  type UA = { userAchievement: { id: number; userId: number; achievementId: number; unlockedAt: Date }; achievement: unknown };
  const unlockedIds = new Set((userAchievements as UA[] ?? []).map((ua) => ua.userAchievement.achievementId));
  const unlockedCount = unlockedIds.size;
  const totalCount = allAchievements?.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const byRarity = {
    legendary: allAchievements?.filter(a => a.rarity === 'legendary') ?? [],
    epic: allAchievements?.filter(a => a.rarity === 'epic') ?? [],
    rare: allAchievements?.filter(a => a.rarity === 'rare') ?? [],
    common: allAchievements?.filter(a => a.rarity === 'common') ?? [],
  };

  const isLoading = loadingAll || loadingUser;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            ACHIEVE<span className="text-primary">MENTS</span>
          </h1>
          <p className="text-muted-foreground">Unlock badges by completing milestones and earning rewards</p>
        </div>

        {/* Progress Banner */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/15 flex items-center justify-center shrink-0">
              <Trophy className="w-7 h-7 text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display font-bold">Overall Progress</p>
                <span className="text-sm font-bold text-primary">{unlockedCount} / {totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2.5 bg-secondary" />
              <p className="text-xs text-muted-foreground mt-1.5">{progressPercent}% complete — keep earning to unlock more!</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {Object.entries(byRarity).map(([rarity, items]) => {
              const cfg = rarityConfig[rarity as keyof typeof rarityConfig];
              const unlocked = items.filter(a => unlockedIds.has(a.id)).length;
              return (
                <div key={rarity} className={cn("p-3 rounded-lg border text-center", cfg.color)}>
                  <p className="font-bold text-lg">{unlocked}/{items.length}</p>
                  <p className="text-xs capitalize">{rarity}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Achievement Sections */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-3" />
                <div className="h-3 bg-secondary rounded w-2/3 mx-auto mb-2" />
                <div className="h-2 bg-secondary rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byRarity).map(([rarity, items]) => {
              if (items.length === 0) return null;
              const cfg = rarityConfig[rarity as keyof typeof rarityConfig];
              return (
                <div key={rarity}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn("text-sm font-bold px-3 py-1 rounded-full border capitalize", cfg.color)}>
                      {rarity}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">
                      {items.filter(a => unlockedIds.has(a.id)).length}/{items.length} unlocked
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {items.map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={{
                          ...achievement,
                          unlockedAt: (userAchievements as UA[] ?? []).find((ua) => ua.userAchievement.achievementId === achievement.id)?.userAchievement.unlockedAt
                        }}
                        unlocked={unlockedIds.has(achievement.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
