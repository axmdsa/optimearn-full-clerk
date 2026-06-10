import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpen, TrendingUp, TrendingDown, Zap, Gift, ShoppingBag, Users, Star, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  task_reward:    { icon: <Zap className="w-4 h-4" />,        color: "text-primary bg-primary/15",        label: "Task Reward" },
  daily_bonus:    { icon: <Gift className="w-4 h-4" />,       color: "text-orange-400 bg-orange-400/15",  label: "Daily Bonus" },
  redemption:     { icon: <ShoppingBag className="w-4 h-4" />, color: "text-red-400 bg-red-400/15",       label: "Redemption" },
  referral_bonus: { icon: <Users className="w-4 h-4" />,      color: "text-purple-400 bg-purple-400/15", label: "Referral Bonus" },
  achievement:    { icon: <Trophy className="w-4 h-4" />,     color: "text-yellow-400 bg-yellow-400/15", label: "Achievement" },
  bonus:          { icon: <Star className="w-4 h-4" />,       color: "text-blue-400 bg-blue-400/15",     label: "Bonus" },
};

export default function PointsLedger() {
  const { data: transactions, isLoading } = trpc.ledger.list.useQuery();
  const { data: profile } = trpc.user.getProfile.useQuery();

  type Tx = { id: number; userId: number; amount: number; balanceAfter: number; type: string; description: string; createdAt: Date };
  const txList = (transactions as Tx[] | undefined) ?? [];
  const totalIn = txList.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = txList.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            POINTS <span className="text-primary">LEDGER</span>
          </h1>
          <p className="text-muted-foreground">Complete history of your points activity</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Balance</span>
            </div>
            <p className="text-xl font-display font-bold text-primary">{(profile?.points ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Total In</span>
            </div>
            <p className="text-xl font-display font-bold text-green-400">+{totalIn.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Total Out</span>
            </div>
            <p className="text-xl font-display font-bold text-red-400">-{totalOut.toLocaleString()}</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-display font-bold">Transaction History</h2>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border/50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-1/3" />
                    <div className="h-3 bg-secondary rounded w-1/4" />
                  </div>
                  <div className="h-5 bg-secondary rounded w-16" />
                </div>
              ))}
            </div>
          ) : txList.length > 0 ? (
            <div className="divide-y divide-border/50">
              {txList.map((tx) => {
                const config = typeConfig[tx.type] ?? typeConfig.bonus;
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{config.label}</span>
                        <span className="text-xs text-muted-foreground/50">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("font-bold text-sm", isPositive ? "text-primary" : "text-red-400")}>
                        {isPositive ? '+' : ''}{tx.amount.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.balanceAfter.toLocaleString()} bal</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Complete tasks to start earning points!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
