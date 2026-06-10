import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Clock, Download, RefreshCw, Repeat2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PostbackRetryDashboard() {
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { data: networks } = trpc.admin.networks.list.useQuery();
  const { data: postbacks, isLoading } = trpc.postbackRetry.getRetries.useQuery({
    networkId: networkFilter === 'all' ? undefined : networkFilter,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    startDate: new Date(dateRange.start),
    endDate: new Date(dateRange.end),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getBackoffDelay = (retryCount: number): number => {
    return Math.min(300, Math.pow(2, retryCount - 1) * 10) * 1000;
  };

  const calculateNextRetry = (lastAttempt: Date, retryCount: number): Date => {
    return new Date(lastAttempt.getTime() + getBackoffDelay(retryCount));
  };

  const successCount = postbacks?.filter((p: any) => p.status === 'success').length || 0;
  const failedCount = postbacks?.filter((p: any) => p.status === 'failed').length || 0;
  const pendingCount = postbacks?.filter((p: any) => p.status === 'pending').length || 0;
  const totalCount = postbacks?.length || 0;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Repeat2 className="w-8 h-8" />
          Postback Retry Dashboard
        </h1>
        <p className="text-muted-foreground">Monitor postback delivery attempts and retry history with exponential backoff</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Delivery success</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Postbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In date range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Delivery failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pending Retry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting retry</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter postback retry records by network, status, and date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Network</label>
              <Select value={networkFilter} onValueChange={(val) => setNetworkFilter(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  {networks?.map((network: any) => (
                    <SelectItem key={network.id} value={String(network.id)}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Retry History */}
      <Card>
        <CardHeader>
          <CardTitle>Postback Retry History</CardTitle>
          <CardDescription>Timeline of postback delivery attempts with exponential backoff strategy</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : postbacks && postbacks.length > 0 ? (
            <div className="space-y-4">
              {postbacks.map((postback: any) => (
                <div key={postback.id} className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(postback.status)}
                      <div>
                        <p className="font-semibold text-white">
                          {postback.networkName} - Offer #{postback.offerId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Completion ID: <span className="font-mono">{postback.completionId}</span>
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={postback.status === 'success' ? 'default' : postback.status === 'failed' ? 'destructive' : 'secondary'}
                    >
                      {postback.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Retry Timeline */}
                  {postback.retries && postback.retries.length > 0 && (
                    <div className="ml-7 space-y-2 mb-4 pb-4 border-b border-border">
                      {postback.retries.map((retry: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-muted-foreground min-w-fit">
                            Attempt {idx + 1}:
                          </span>
                          <span className="font-mono text-xs text-primary">
                            {format(new Date(retry.attemptedAt), 'MMM dd, HH:mm:ss')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {retry.statusCode}
                          </Badge>
                          {idx < (postback.retries?.length || 0) - 1 && (
                            <span className="text-muted-foreground text-xs ml-auto">
                              → Next in {Math.round(getBackoffDelay(idx + 1) / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error Message */}
                  {postback.lastError && (
                    <div className="ml-7 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm mb-4">
                      <p className="font-medium text-red-400 mb-1">Last Error:</p>
                      <p className="font-mono text-xs text-red-300">{postback.lastError}</p>
                    </div>
                  )}

                  {/* Next Retry */}
                  {postback.status === 'pending' && postback.retries && postback.retries.length > 0 && (
                    <div className="ml-7 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm mb-4">
                      <p className="flex items-center gap-2 text-yellow-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          Next retry: {format(
                            calculateNextRetry(
                              new Date(postback.retries[postback.retries.length - 1].attemptedAt),
                              postback.retries.length
                            ),
                            'MMM dd, HH:mm:ss'
                          )}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Postback URL */}
                  <div className="ml-7 p-3 bg-secondary/50 border border-border rounded-lg text-xs">
                    <p className="text-muted-foreground mb-1">Postback URL:</p>
                    <p className="font-mono break-all text-gray-300">{postback.postbackUrl}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No postback retry records found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
