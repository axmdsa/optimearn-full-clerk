import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Copy, Share2, TrendingUp, Star, Gift, ChevronRight, CheckCircle2, Crown } from "lucide-react";

const TIERS = [
  { name: "Bronze", min: 0, max: 4, commission: "10%", color: "text-orange-400 bg-orange-400/15 border-orange-400/30", icon: "🥉" },
  { name: "Silver", min: 5, max: 14, commission: "15%", color: "text-gray-300 bg-gray-400/10 border-gray-400/20", icon: "🥈" },
  { name: "Gold", min: 15, max: 29, commission: "20%", color: "text-yellow-400 bg-yellow-400/15 border-yellow-400/30", icon: "🥇" },
  { name: "Platinum", min: 30, max: Infinity, commission: "25%", color: "text-primary bg-primary/15 border-primary/30", icon: "💎" },
];

export default function Referrals() {
  const { data: referralData, isLoading } = trpc.referrals.getStats.useQuery();

  const { data: myCode } = trpc.referrals.getMyCode.useQuery();
  const referralLink = myCode?.referralCode ? `${window.location.origin}?ref=${myCode.referralCode}` : `${window.location.origin}?ref=...`;
  const referralCount = referralData?.count ?? 0;
  const currentTier = TIERS.find(t => referralCount >= t.min && referralCount <= t.max) ?? TIERS[0];

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join OptimEarn', text: 'Earn real rewards by completing tasks!', url: referralLink });
    } else {
      copyLink();
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            REFERRAL <span className="text-primary">PROGRAM</span>
          </h1>
          <p className="text-muted-foreground">Invite friends and earn a commission on everything they earn!</p>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 mb-8 card-glow-border">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display font-bold text-xl mb-1">Earn up to <span className="text-primary">25%</span> Commission</h2>
              <p className="text-muted-foreground text-sm">For every point your referrals earn, you get a percentage. The more you refer, the higher your tier!</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-3xl font-display font-black text-primary">{referralCount}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Referral Link */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                Your Referral Link
              </h3>
              <div className="flex gap-2">
                <Input
                  value={isLoading ? 'Loading...' : referralLink}
                  readOnly
                  className="bg-secondary border-border text-sm font-mono"
                />
                <Button onClick={copyLink} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={shareLink} variant="outline" className="w-full mt-3 border-border text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-primary">{referralData?.count ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Referred</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-green-400">{(referralData?.earned ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Points Earned</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-2xl font-display font-bold text-yellow-400">{currentTier.commission}</p>
                <p className="text-xs text-muted-foreground mt-1">Commission Rate</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-display font-bold mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Share your link', desc: 'Copy and share your unique referral link with friends.' },
                  { step: '2', title: 'Friend signs up', desc: 'When they register using your link, they become your referral.' },
                  { step: '3', title: 'Earn commission', desc: 'You earn a percentage of every point they earn, forever!' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Tiers */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Commission Tiers
              </h3>
              <div className="space-y-3">
                {TIERS.map((tier) => {
                  const isActive = tier.name === currentTier.name;
                  return (
                    <div
                      key={tier.name}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        isActive ? tier.color : "bg-secondary/30 border-border/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tier.icon}</span>
                          <div>
                            <p className={cn("font-semibold text-sm", isActive ? "" : "text-muted-foreground")}>
                              {tier.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tier.max === Infinity ? `${tier.min}+ referrals` : `${tier.min}–${tier.max} referrals`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold text-sm", isActive ? "text-current" : "text-muted-foreground")}>
                            {tier.commission}
                          </p>
                          {isActive && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Active</span>
                          )}
                        </div>
                      </div>
                      {isActive && tier.max !== Infinity && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{referralCount} / {tier.max + 1} for next tier</span>
                          </div>
                          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-current rounded-full transition-all"
                              style={{ width: `${Math.min(((referralCount - tier.min) / (tier.max - tier.min + 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
