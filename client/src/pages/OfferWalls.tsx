import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Layers, Star, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";

const providerColors = [
  "from-blue-500/20 to-blue-500/5 border-blue-500/20",
  "from-purple-500/20 to-purple-500/5 border-purple-500/20",
  "from-green-500/20 to-green-500/5 border-green-500/20",
  "from-orange-500/20 to-orange-500/5 border-orange-500/20",
  "from-pink-500/20 to-pink-500/5 border-pink-500/20",
  "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20",
  "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20",
  "from-red-500/20 to-red-500/5 border-red-500/20",
];

const providerEmojis = ['🎮', '📺', '💎', '🚀', '⚡', '📊', '🎯', '🌟'];

export default function OfferWalls() {
  const { data: providers, isLoading } = trpc.offerWalls.list.useQuery();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            OFFER <span className="text-primary">WALLS</span>
          </h1>
          <p className="text-muted-foreground">
            Access hundreds of offers from our trusted partner networks. Complete tasks and earn big.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-primary">1,642+</p>
            <p className="text-xs text-muted-foreground mt-1">Total Offers</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-green-400">$2.80</p>
            <p className="text-xs text-muted-foreground mt-1">Avg. Payout</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-blue-400">8</p>
            <p className="text-xs text-muted-foreground mt-1">Networks</p>
          </div>
        </div>

        {/* Provider Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-secondary mb-4" />
                <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-secondary rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(providers ?? []).map((provider, i) => (
              <div
                key={provider.id}
                className={cn(
                  "bg-gradient-to-br border rounded-xl p-6 hover:-translate-y-1 transition-all duration-200 cursor-pointer group",
                  providerColors[i % providerColors.length]
                )}
                onClick={() => toast.info(`${provider.name} offers coming soon!`)}
              >
                {/* Logo placeholder */}
                <div className="w-14 h-14 rounded-xl bg-background/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  {providerEmojis[i % providerEmojis.length]}
                </div>

                <h3 className="font-display font-bold text-base mb-1">{provider.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{provider.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Offers</p>
                    <p className="font-bold text-sm">{provider.totalOffers.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Avg. Payout</p>
                    <p className="font-bold text-sm text-primary">${provider.avgPayout}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full bg-background/50 hover:bg-background/80 text-foreground border border-border/50 text-xs font-semibold"
                  onClick={(e) => { e.stopPropagation(); toast.info('Offer wall integration coming soon!'); }}
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Browse Offers
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold mb-1">How Offer Walls Work</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Offer walls are aggregated collections of tasks from advertising networks. Each network provides
                different types of offers — from app installs to surveys to free trials. Complete any offer to
                earn the listed points, which you can then redeem for real cash rewards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
