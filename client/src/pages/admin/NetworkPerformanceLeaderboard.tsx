import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp, TrendingDown, Award, Target, Clock, Zap } from 'lucide-react';

export function NetworkPerformanceLeaderboard() {
  const [sortBy, setSortBy] = useState<'conversion' | 'payout' | 'speed'>('conversion');

  const { data: stats, isLoading } = trpc.admin.networks.getPerformanceStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const networks = stats?.networks || [];
  const sortedNetworks = [...networks].sort((a, b) => {
    switch (sortBy) {
      case 'conversion':
        return (b.conversionRate || 0) - (a.conversionRate || 0);
      case 'payout':
        return (b.avgPayout || 0) - (a.avgPayout || 0);
      case 'speed':
        return (a.avgApprovalTime || 0) - (b.avgApprovalTime || 0);
      default:
        return 0;
    }
  });

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Award className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const renderNetworkCard = (network: any, index: number, metric: 'conversion' | 'payout' | 'speed') => (
    <Card key={network.id} className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20">
              {getMedalIcon(index) || <span className="text-sm font-bold text-primary">{index + 1}</span>}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{network.name}</h3>
              <p className="text-xs text-muted-foreground">{network.completionCount} completions</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              {metric === 'conversion' && <TrendingUp className="w-4 h-4 text-green-500" />}
              {metric === 'payout' && <Target className="w-4 h-4 text-blue-500" />}
              {metric === 'speed' && <Zap className="w-4 h-4 text-purple-500" />}
              <span className="text-2xl font-bold">
                {metric === 'conversion' && `${(network.conversionRate || 0).toFixed(1)}%`}
                {metric === 'payout' && `$${(network.avgPayout || 0).toFixed(2)}`}
                {metric === 'speed' && `${Math.round(network.avgApprovalTime || 0)}h`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {metric === 'conversion' && 'Conversion Rate'}
              {metric === 'payout' && 'Avg Payout'}
              {metric === 'speed' && 'Avg Approval Time'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
            <p className="text-lg font-semibold">{(network.conversionRate || 0).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Avg Payout</p>
            <p className="text-lg font-semibold">${(network.avgPayout || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Approval Time</p>
            <p className="text-lg font-semibold">{Math.round(network.avgApprovalTime || 0)}h</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <Badge variant={network.reliabilityScore >= 90 ? 'default' : 'secondary'}>
            Reliability: {network.reliabilityScore || 0}%
          </Badge>
          <Badge variant={network.approvalRate >= 80 ? 'default' : 'secondary'}>
            Approval: {network.approvalRate || 0}%
          </Badge>
          <Badge variant="outline">
            ${(network.totalEarned || 0).toFixed(2)} earned
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Award className="w-8 h-8" />
          Network Performance Leaderboard
        </h1>
        <p className="text-muted-foreground">Compare affiliate networks by conversion rate, payout, and approval speed</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{networks[0]?.name || '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">{networks[0]?.conversionRate.toFixed(1) || 0}% conversion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${Math.max(...networks.map((n: any) => n.avgPayout || 0)).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average payout across networks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fastest Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{Math.min(...networks.map((n: any) => n.avgApprovalTime || Infinity))}h</div>
            <p className="text-xs text-muted-foreground mt-1">Quickest approval time</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="conversion" onValueChange={(v) => setSortBy(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Conversion Rate
          </TabsTrigger>
          <TabsTrigger value="payout" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Avg Payout
          </TabsTrigger>
          <TabsTrigger value="speed" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Approval Speed
          </TabsTrigger>
        </TabsList>

        {/* Conversion Rate Tab */}
        <TabsContent value="conversion" className="space-y-4">
          <div className="space-y-4">
            {sortedNetworks.length > 0 ? (
              sortedNetworks.map((network, index) => renderNetworkCard(network, index, 'conversion'))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No network data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Payout Tab */}
        <TabsContent value="payout" className="space-y-4">
          <div className="space-y-4">
            {sortedNetworks.length > 0 ? (
              sortedNetworks.map((network, index) => renderNetworkCard(network, index, 'payout'))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No network data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Speed Tab */}
        <TabsContent value="speed" className="space-y-4">
          <div className="space-y-4">
            {sortedNetworks.length > 0 ? (
              sortedNetworks.map((network, index) => renderNetworkCard(network, index, 'speed'))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No network data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
