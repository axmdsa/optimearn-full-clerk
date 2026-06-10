import { Lock, Clock, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PendingPointsCardProps {
  pendingPoints: number;
  confirmedPoints: number;
  estimatedVerificationHours?: number;
}

export function PendingPointsCard({
  pendingPoints,
  confirmedPoints,
  estimatedVerificationHours = 24,
}: PendingPointsCardProps) {
  const totalPoints = pendingPoints + confirmedPoints;
  const pendingPercentage = totalPoints > 0 ? (pendingPoints / totalPoints) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-semibold">Points Status</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full cursor-help">
                Pending
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                High-value offer completions are verified by our affiliate networks before you can cash out.
                This typically takes {estimatedVerificationHours} hours.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Points Breakdown */}
      <div className="space-y-3 mb-4">
        {/* Confirmed Points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-sm">Confirmed & Ready</span>
          </div>
          <span className="text-green-400 font-semibold">{confirmedPoints.toLocaleString()}</span>
        </div>

        {/* Pending Points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400 text-sm">Pending Verification</span>
          </div>
          <span className="text-amber-400 font-semibold">{pendingPoints.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalPoints > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Verification Progress</span>
            <span className="text-xs text-gray-500">{Math.round(pendingPercentage)}% pending</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${100 - pendingPercentage}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${pendingPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Info Message */}
      {pendingPoints > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
          <p>
            💡 You have <strong>{pendingPoints.toLocaleString()} points</strong> waiting for verification.
            You can see these in your account, but can't cash out until they're confirmed.
          </p>
        </div>
      )}

      {/* Total Points */}
      <div className="mt-4 pt-4 border-t border-amber-500/10">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Points</span>
          <span className="text-white font-bold text-lg">{totalPoints.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
