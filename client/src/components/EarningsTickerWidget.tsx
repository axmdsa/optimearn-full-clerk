import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EarningsTicker {
  totalPending: number;
  totalConfirmed: number;
  todayEarnings: number;
  conversionRate: number;
  lastUpdate: Date;
}

interface EarningsTickerWidgetProps {
  data: EarningsTicker;
  isLive?: boolean;
}

export function EarningsTickerWidget({ data, isLive = false }: EarningsTickerWidgetProps) {
  const [displayValues, setDisplayValues] = useState({
    pending: data.totalPending,
    confirmed: data.totalConfirmed,
    today: data.todayEarnings,
  });
  const [animatingField, setAnimatingField] = useState<string | null>(null);

  // Animate number changes
  useEffect(() => {
    if (displayValues.pending !== data.totalPending) {
      setAnimatingField('pending');
      const timer = setTimeout(() => {
        setDisplayValues(prev => ({ ...prev, pending: data.totalPending }));
        setAnimatingField(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data.totalPending, displayValues.pending]);

  useEffect(() => {
    if (displayValues.confirmed !== data.totalConfirmed) {
      setAnimatingField('confirmed');
      const timer = setTimeout(() => {
        setDisplayValues(prev => ({ ...prev, confirmed: data.totalConfirmed }));
        setAnimatingField(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data.totalConfirmed, displayValues.confirmed]);

  useEffect(() => {
    if (displayValues.today !== data.todayEarnings) {
      setAnimatingField('today');
      const timer = setTimeout(() => {
        setDisplayValues(prev => ({ ...prev, today: data.todayEarnings }));
        setAnimatingField(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data.todayEarnings, displayValues.today]);

  const formatCurrency = (value: number) => {
    return `$${(value / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Live Indicator */}
      {isLive && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Live Updates Enabled</span>
        </div>
      )}

      {/* Main Ticker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confirmed Earnings */}
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm text-muted-foreground">Confirmed</span>
            </div>
          </div>
          <div
            className={cn(
              "text-3xl font-bold text-green-400 transition-all duration-300",
              animatingField === 'confirmed' && "scale-110 text-green-300"
            )}
          >
            {formatCurrency(displayValues.confirmed)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Available to withdraw</p>
        </Card>

        {/* Pending Earnings */}
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
          </div>
          <div
            className={cn(
              "text-3xl font-bold text-amber-400 transition-all duration-300",
              animatingField === 'pending' && "scale-110 text-amber-300"
            )}
          >
            {formatCurrency(displayValues.pending)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Awaiting verification</p>
        </Card>

        {/* Today's Earnings */}
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
          </div>
          <div
            className={cn(
              "text-3xl font-bold text-blue-400 transition-all duration-300",
              animatingField === 'today' && "scale-110 text-blue-300"
            )}
          >
            {formatCurrency(displayValues.today)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Earned today</p>
        </Card>
      </div>

      {/* Conversion Rate */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-primary">{data.conversionRate.toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
            <p className="text-sm font-mono">
              {data.lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-secondary/50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Total Earnings</p>
            <p className="font-bold text-lg">
              {formatCurrency(displayValues.confirmed + displayValues.pending)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Completion Rate</p>
            <p className="font-bold text-lg">
              {data.conversionRate > 0 ? `${data.conversionRate.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
