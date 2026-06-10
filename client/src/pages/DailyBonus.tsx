import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Flame, Gift, Star, Trophy, Zap, CheckCircle2, Lock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

// Spin wheel segments
const SEGMENTS = [
  { label: "50 pts",   points: 50,   color: "#22c55e", textColor: "#fff" },
  { label: "100 pts",  points: 100,  color: "#3b82f6", textColor: "#fff" },
  { label: "25 pts",   points: 25,   color: "#a855f7", textColor: "#fff" },
  { label: "500 pts",  points: 500,  color: "#f59e0b", textColor: "#000" },
  { label: "75 pts",   points: 75,   color: "#ec4899", textColor: "#fff" },
  { label: "200 pts",  points: 200,  color: "#14b8a6", textColor: "#fff" },
  { label: "10 pts",   points: 10,   color: "#6366f1", textColor: "#fff" },
  { label: "1000 pts", points: 1000, color: "#ef4444", textColor: "#fff" },
];

const STREAK_MILESTONES = [
  { day: 1, bonus: 50,   label: "Day 1" },
  { day: 3, bonus: 150,  label: "Day 3" },
  { day: 7, bonus: 500,  label: "Day 7" },
  { day: 14, bonus: 1000, label: "Day 14" },
  { day: 30, bonus: 3000, label: "Day 30" },
];

function SpinWheel({ canSpin, onSpin }: { canSpin: boolean; onSpin: (points: number, label: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number | undefined>(undefined);

  const drawWheel = useCallback((rot: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 8;
    const arc = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer glow ring
    const gradient = ctx.createRadialGradient(cx, cy, radius - 4, cx, cy, radius + 8);
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    SEGMENTS.forEach((seg, i) => {
      const startAngle = rot + i * arc;
      const endAngle = startAngle + arc;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(seg.label, radius - 12, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#1c1e35';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center icon
    ctx.fillStyle = '#4ade80';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', cx, cy);
  }, []);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, drawWheel]);

  const handleSpin = () => {
    if (spinning || !canSpin) return;
    setSpinning(true);

    // Pick a random segment
    const winIndex = Math.floor(Math.random() * SEGMENTS.length);
    const winSegment = SEGMENTS[winIndex];

    // Calculate target rotation: multiple full spins + land on segment
    const arc = (2 * Math.PI) / SEGMENTS.length;
    const targetSegmentAngle = -(winIndex * arc + arc / 2); // Center of winning segment at top
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const targetRotation = rotation + fullSpins + targetSegmentAngle - (rotation % (2 * Math.PI));

    const duration = 4000;
    const startTime = performance.now();
    const startRotation = rotation;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + (targetRotation - startRotation) * eased;
      setRotation(currentRot);
      drawWheel(currentRot);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        onSpin(winSegment.points, winSegment.label);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className={cn("rounded-full spin-shadow", spinning && "cursor-not-allowed")}
        />
      </div>

      <Button
        onClick={handleSpin}
        disabled={spinning || !canSpin}
        size="lg"
        className={cn(
          "font-bold text-base px-10 h-12 transition-all",
          canSpin && !spinning
            ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-green animate-pulse-glow"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        )}
      >
        {spinning ? (
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 animate-spin" />
            Spinning...
          </span>
        ) : canSpin ? (
          <span className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            SPIN NOW!
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Already Claimed Today
          </span>
        )}
      </Button>
    </div>
  );
}

export default function DailyBonus() {
  const utils = trpc.useUtils();
  const { data: canClaimData, isLoading } = trpc.dailyBonus.canClaim.useQuery();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const claimBonus = trpc.dailyBonus.claim.useMutation({
    onSuccess: (data) => {
      toast.success(`🎉 You won ${data.pointsWon} points!`, { duration: 5000 });
      utils.dailyBonus.canClaim.invalidate();
      utils.user.getProfile.invalidate();
      utils.notifications.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [wonPoints, setWonPoints] = useState<number | null>(null);

  const handleSpin = (points: number, label: string) => {
    setWonPoints(points);
    claimBonus.mutate({ pointsWon: points, spinResult: label });
  };

  const streak = profile?.streak ?? 0;
  const canSpin = canClaimData?.canClaim ?? false;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            DAILY <span className="text-primary">BONUS</span>
          </h1>
          <p className="text-muted-foreground">Spin the wheel once per day to earn bonus points!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Spin Wheel */}
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center">
            {isLoading ? (
              <div className="w-[280px] h-[280px] rounded-full bg-secondary animate-pulse" />
            ) : (
              <SpinWheel canSpin={canSpin} onSpin={handleSpin} />
            )}

            {wonPoints !== null && (
              <div className="mt-4 bg-primary/10 border border-primary/30 rounded-xl px-6 py-3 text-center animate-count-up">
                <p className="text-primary font-display font-black text-2xl">+{wonPoints} pts</p>
                <p className="text-sm text-muted-foreground">Added to your balance!</p>
              </div>
            )}

            {!canSpin && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Come back tomorrow for your next spin!</p>
              </div>
            )}
          </div>

          {/* Streak & Info */}
          <div className="space-y-6">
            {/* Current Streak */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-display font-bold">Login Streak</p>
                  <p className="text-sm text-muted-foreground">Keep it going for bonus rewards!</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-display font-black text-orange-400">{streak}</span>
                <span className="text-muted-foreground">days</span>
              </div>
              {/* Streak progress bar */}
              <div className="flex gap-1.5">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-all",
                      i < streak % 7 ? "bg-orange-400" : "bg-secondary"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{7 - (streak % 7)} days until weekly bonus</p>
            </div>

            {/* Streak Milestones */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Streak Milestones
              </h3>
              <div className="space-y-3">
                {STREAK_MILESTONES.map((milestone) => {
                  const achieved = streak >= milestone.day;
                  return (
                    <div key={milestone.day} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      achieved ? "bg-primary/10 border-primary/30" : "bg-secondary/30 border-border/50"
                    )}>
                      <div className="flex items-center gap-3">
                        {achieved ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground/50" />
                        )}
                        <span className={cn("font-semibold text-sm", achieved ? "text-foreground" : "text-muted-foreground")}>
                          {milestone.label}
                        </span>
                      </div>
                      <span className={cn("font-bold text-sm", achieved ? "text-primary" : "text-muted-foreground")}>
                        +{milestone.bonus} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Possible Rewards */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Possible Rewards
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SEGMENTS.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-sm font-medium">{seg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
