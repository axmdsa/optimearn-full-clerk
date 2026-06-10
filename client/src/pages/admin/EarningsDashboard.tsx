import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, Target, AlertCircle, Plus, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NetworkSetupWizard } from "./NetworkSetupWizard";
import { EarningsTickerWidget } from "@/components/EarningsTickerWidget";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function EarningsDashboard() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const { data: networks = [] } = trpc.admin.networks.list.useQuery();
  const { data: stats } = trpc.admin.networks.getStats.useQuery({ networkId: selectedNetwork || undefined });
  const { data: earnings = [] } = trpc.admin.networks.getEarnings.useQuery({
    networkId: selectedNetwork || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Calculate summary stats
  const totalEarnings = earnings.reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);
  const approvedEarnings = earnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);
  const rejectedEarnings = earnings.filter(e => e.status === 'rejected').reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);
  const todayEarnings = earnings.filter(e => new Date(e.earnedAt).toDateString() === new Date().toDateString()).reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);

  // Group earnings by network for pie chart
  const networkEarnings = networks.map(net => {
    const netEarnings = earnings.filter(e => e.affiliateNetworkId === net.id).reduce((sum, e) => sum + (Number(e.publisherPayout) || 0), 0);
    return { name: net.name, value: netEarnings };
  }).filter(n => n.value > 0);

  // Group earnings by status for status breakdown
  const statusBreakdown = [
    { name: 'Pending', value: pendingEarnings, fill: '#f59e0b' },
    { name: 'Approved', value: approvedEarnings, fill: '#22c55e' },
    { name: 'Rejected', value: rejectedEarnings, fill: '#ef4444' },
  ].filter(s => s.value > 0);

  // Calculate conversion rate
  const totalCompletions = stats?.total || 0;
  const approvedCompletions = stats?.approved || 0;
  const conversionRate = totalCompletions > 0 ? ((approvedCompletions / totalCompletions) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
            <DollarSign className="w-8 h-8" />
            Earnings Dashboard
          </h1>
          <p className="text-muted-foreground">Track your revenue from affiliate networks and monitor earnings status</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Network
        </Button>
      </div>

      {/* Real-time Earnings Ticker */}
      <div className="mb-8">
        <EarningsTickerWidget
          data={{
            totalPending: pendingEarnings,
            totalConfirmed: approvedEarnings,
            todayEarnings: todayEarnings,
            conversionRate: Number(conversionRate),
            lastUpdate: new Date(),
          }}
          isLive={true}
        />
      </div>

      <NetworkSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">${approvedEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">${pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${todayEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Current day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Approval rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter earnings by date range and network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={e => setDateRange(d => ({ ...d, start: new Date(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <input 
                type="date" 
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={e => setDateRange(d => ({ ...d, end: new Date(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Network</label>
              <select 
                value={selectedNetwork ?? ''} 
                onChange={e => setSelectedNetwork(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Networks</option>
                {networks.map(net => (
                  <option key={net.id} value={net.id}>{net.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earnings by Network */}
        {networkEarnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Earnings by Network</CardTitle>
              <CardDescription>Revenue distribution across affiliate networks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={networkEarnings} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    label={({ name, value }) => `${name}: $${typeof value === 'number' ? value.toFixed(2) : '0.00'}`} 
                    outerRadius={80} 
                    fill="#8884d8" 
                    dataKey="value"
                  >
                    {networkEarnings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : '0.00'}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Status Breakdown */}
        {statusBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>Earnings by approval status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={statusBreakdown} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    label={({ name, value }) => `${name}: $${typeof value === 'number' ? value.toFixed(2) : '0.00'}`} 
                    outerRadius={80} 
                    fill="#8884d8" 
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : '0.00'}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Latest earnings transactions from all networks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-muted-foreground py-3 px-4 font-medium">Network</th>
                  <th className="text-left text-muted-foreground py-3 px-4 font-medium">Amount</th>
                  <th className="text-left text-muted-foreground py-3 px-4 font-medium">Status</th>
                  <th className="text-left text-muted-foreground py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.slice(0, 20).map((earning: any, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{networks.find(n => n.id === earning.affiliateNetworkId)?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 font-semibold">${earning.publisherPayout?.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      {earning.status === 'approved' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>}
                      {earning.status === 'pending' && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>}
                      {earning.status === 'rejected' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(earning.earnedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {earnings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No earnings found for the selected period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
