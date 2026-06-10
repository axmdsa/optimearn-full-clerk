import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingBag, Star, CheckCircle2, AlertCircle, Wallet, Gift, Bitcoin, Gamepad2, CreditCard } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RewardCategory = 'all' | 'paypal' | 'gift_card' | 'crypto' | 'gaming' | 'other';

const categories: { id: RewardCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Rewards', icon: <Gift className="w-4 h-4" /> },
  { id: 'paypal', label: 'PayPal', icon: <Wallet className="w-4 h-4" /> },
  { id: 'gift_card', label: 'Gift Cards', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-4 h-4" /> },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-4 h-4" /> },
];

const brandEmojis: Record<string, string> = {
  PayPal: '💸', Amazon: '📦', Steam: '🎮', 'Google Play': '▶️',
  Bitcoin: '₿', Ethereum: 'Ξ', Visa: '💳', Roblox: '🎲', Netflix: '🎬'
};

const categoryColors: Record<RewardCategory, string> = {
  all: '', paypal: 'border-blue-500/30', gift_card: 'border-orange-500/30',
  crypto: 'border-yellow-500/30', gaming: 'border-purple-500/30', other: 'border-gray-500/30'
};

interface Reward {
  id: number; name: string; description: string | null;
  category: string; pointsCost: number; brand: string | null;
}

function RedeemModal({ reward, userPoints, open, onClose }: {
  reward: Reward | null; userPoints: number; open: boolean; onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const redeem = trpc.rewards.redeem.useMutation({
    onSuccess: () => {
      toast.success(`🎉 Redemption submitted! Processing your ${reward?.name}.`);
      utils.user.getProfile.invalidate();
      utils.rewards.myRedemptions.invalidate();
      setPaymentAddress('');
      setPaymentNote('');
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!reward) return null;
  const canAfford = userPoints >= reward.pointsCost;

  // Determine payment method from reward category
  const isPayPal = reward.category === 'paypal';
  const isCrypto = reward.category === 'crypto';
  const needsPaymentAddress = isPayPal || isCrypto;
  const paymentAddressLabel = isPayPal ? 'PayPal Email Address' : isCrypto ? 'Crypto Wallet Address' : '';
  const paymentAddressPlaceholder = isPayPal ? 'your@email.com' : isCrypto ? '0x... or bc1...' : '';
  const paymentMethod = isPayPal ? 'paypal' : isCrypto ? 'crypto' : reward.category === 'gift_card' ? 'gift_card' : 'other';
  const isPaymentAddressRequired = needsPaymentAddress && !paymentAddress.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Confirm Redemption</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
            <div className="text-4xl">{brandEmojis[reward.brand ?? ''] ?? '🎁'}</div>
            <div>
              <p className="font-semibold">{reward.name}</p>
              <p className="text-sm text-muted-foreground">{reward.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
            <span className="text-sm text-muted-foreground">Cost</span>
            <span className="font-bold text-primary">{reward.pointsCost.toLocaleString()} pts</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className={cn("font-bold", canAfford ? "text-foreground" : "text-destructive")}>
              {userPoints.toLocaleString()} pts
            </span>
          </div>

          {canAfford ? (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                After redemption you'll have <span className="text-foreground font-medium">{(userPoints - reward.pointsCost).toLocaleString()} pts</span> remaining.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-muted-foreground">
                You need <span className="text-destructive font-medium">{(reward.pointsCost - userPoints).toLocaleString()} more pts</span> to redeem this reward.
              </p>
            </div>
          )}

          {/* Payment Details */}
          {needsPaymentAddress && (
            <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{paymentAddressLabel} <span className="text-destructive">*</span></Label>
                <Input
                  value={paymentAddress}
                  onChange={(e) => setPaymentAddress(e.target.value)}
                  placeholder={paymentAddressPlaceholder}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  {isPayPal ? 'Funds will be sent to this PayPal account.' : 'Tokens will be sent to this wallet address.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Note (optional)</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Any additional info for the admin..."
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 border-border">Cancel</Button>
            <Button
              onClick={() => redeem.mutate({
                rewardId: reward.id,
                paymentMethod,
                paymentAddress: paymentAddress.trim() || undefined,
                paymentNote: paymentNote.trim() || undefined,
              })}
              disabled={!canAfford || redeem.isPending || isPaymentAddressRequired}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {redeem.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RewardsShop() {
  const [activeCategory, setActiveCategory] = useState<RewardCategory>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const { data: rewards, isLoading } = trpc.rewards.list.useQuery({ category: activeCategory });
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { data: redemptions } = trpc.rewards.myRedemptions.useQuery();

  const userPoints = profile?.points ?? 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              <span className="text-primary">CASH</span>OUT
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Redeem your points for real rewards</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
            <Star className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">{userPoints.toLocaleString()} pts</span>
            <span className="text-muted-foreground text-sm">available</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Rewards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-secondary mb-4" />
                <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(rewards ?? []).map((reward) => {
              const canAfford = userPoints >= reward.pointsCost;
              return (
                <div
                  key={reward.id}
                  className={cn(
                    "bg-card border rounded-xl p-5 hover:border-primary/30 transition-all duration-150 cursor-pointer group flex flex-col",
                    canAfford ? "border-border" : "border-border opacity-70"
                  )}
                  onClick={() => setSelectedReward(reward as Reward)}
                >
                  {/* Brand icon */}
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                    {brandEmojis[reward.brand ?? ''] ?? '🎁'}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">{reward.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{reward.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className={cn("font-bold text-sm", canAfford ? "text-primary" : "text-muted-foreground")}>
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                    <Button
                      size="sm"
                      className={cn(
                        "text-xs font-semibold transition-all",
                        canAfford
                          ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30"
                          : "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                      )}
                      disabled={!canAfford}
                    >
                      {canAfford ? 'Redeem' : 'Need more pts'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Redemption History */}
        {redemptions && redemptions.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display font-bold text-lg mb-4">Redemption History</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border/50">
                {redemptions.map((r) => (
                  <div key={r.redemption.id} className="flex items-center gap-4 p-4">
                    <div className="text-2xl">{brandEmojis[r.reward?.brand ?? ''] ?? '🎁'}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{r.reward?.name ?? 'Reward'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.redemption.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-destructive">-{r.redemption.pointsSpent.toLocaleString()} pts</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        r.redemption.status === 'completed' ? "bg-green-500/15 text-green-400" :
                        r.redemption.status === 'pending' ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {r.redemption.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <RedeemModal
        reward={selectedReward}
        userPoints={userPoints}
        open={!!selectedReward}
        onClose={() => setSelectedReward(null)}
      />
    </AppLayout>
  );
}
