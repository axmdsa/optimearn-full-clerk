import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Download, RefreshCw, Calendar } from "lucide-react";

export default function AdminTracking() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0], // today
  });

  // Fetch all tasks for dropdown
  const { data: tasks = [] } = trpc.tasks.list.useQuery({ category: "all" });

  // Fetch tracking config
  const { data: config, isLoading: configLoading } = trpc.tracking.getConfig.useQuery(
    selectedTaskId ? { taskId: selectedTaskId } : skipToken,
    { enabled: !!selectedTaskId }
  );

  // Fetch click stats
  const { data: clickData, isLoading: clickLoading, refetch: refetchClicks } = trpc.tracking.getClickStats.useQuery(
    selectedTaskId ? { taskId: selectedTaskId, limit: 100, offset: 0 } : skipToken,
    { enabled: !!selectedTaskId }
  );

  // Fetch completion stats
  const { data: completionData, isLoading: completionLoading, refetch: refetchCompletions } = trpc.tracking.getCompletionStats.useQuery(
    selectedTaskId ? { taskId: selectedTaskId, limit: 100, offset: 0 } : skipToken,
    { enabled: !!selectedTaskId }
  );

  // Fetch postback stats
  const { data: postbackStats, isLoading: postbackLoading, refetch: refetchPostbacks } = trpc.tracking.getPostbackStats.useQuery(
    selectedTaskId ? { taskId: selectedTaskId } : skipToken,
    { enabled: !!selectedTaskId }
  );

  // Update completion status mutation
  const updateStatusMutation = trpc.tracking.updateCompletionStatus.useMutation({
    onSuccess: () => {
      refetchCompletions();
    },
  });

  // Configure tracking mutation
  const configMutation = trpc.tracking.configureTracking.useMutation({
    onSuccess: () => {
      alert("Tracking configuration updated successfully!");
    },
  });

  const handleRefresh = () => {
    refetchClicks();
    refetchCompletions();
    refetchPostbacks();
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const filteredClicks = clickData?.clicks?.filter((click) => {
    const clickDate = new Date(click.clickedAt).toISOString().split('T')[0];
    return clickDate >= dateRange.start && clickDate <= dateRange.end;
  }) || [];

  const filteredCompletions = completionData?.completions?.filter((comp) => {
    const compDate = new Date(comp.completedAt).toISOString().split('T')[0];
    return compDate >= dateRange.start && compDate <= dateRange.end;
  }) || [];

  const handleExportCSV = () => {
    if (!filteredClicks) return;
    
    const csv = [
      ["Click ID", "User ID", "IP Address", "Country", "Clicked At"],
      ...filteredClicks.map((click) => [
        click.clickId,
        click.userId || "N/A",
        click.ipAddress || "N/A",
        click.country || "N/A",
        new Date(click.clickedAt).toISOString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracking-clicks-${selectedTaskId}-${Date.now()}.csv`;
    a.click();
  };

  const isLoading = configLoading || clickLoading || completionLoading || postbackLoading;

  // Prepare chart data
  const chartData = [
    {
      name: "Clicks",
      value: clickData?.stats.clicks || 0,
    },
    {
      name: "Completions",
      value: clickData?.stats.completions || 0,
    },
    {
      name: "Conversions",
      value: clickData?.stats.conversions || 0,
    },
  ];

  // Redirect if not admin - AFTER all hooks
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don't have permission to access the tracking dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Offer Tracking Dashboard</h1>
        <p className="text-muted-foreground">Monitor clicks, completions, and conversions for your offers</p>
      </div>

      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Offer</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTaskId?.toString() || ""} onValueChange={(val) => setSelectedTaskId(parseInt(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an offer to track..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id.toString()}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTaskId && (
        <>
          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Range Filter
              </CardTitle>
              <CardDescription>Filter tracking data by date range (default: last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium block mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium block mb-2">End Date</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDateRange({
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0],
                  })}
                >
                  Reset to 30 Days
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Showing {filteredClicks.length} clicks and {filteredCompletions.length} completions in selected range
              </div>
            </CardContent>
          </Card>

          {/* Tracking Configuration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracking Configuration</CardTitle>
                <CardDescription>Configure postback URL and click ID format</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {configLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Postback URL</label>
                    <Input
                      type="url"
                      placeholder="https://publisher.com/postback"
                      defaultValue={config?.postbackUrl || ""}
                      onChange={(e) => {
                        // Store for later submission
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Click ID Format</label>
                    <Select defaultValue={config?.clickIdFormat || "uuid"}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uuid">UUID</SelectItem>
                        <SelectItem value="uuid_prefix">UUID with Prefix</SelectItem>
                        <SelectItem value="sequential">Sequential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      const postbackUrl = (document.querySelector('input[type="url"]') as HTMLInputElement)?.value;
                      configMutation.mutate({
                        taskId: selectedTaskId,
                        postbackUrl: postbackUrl || undefined,
                        trackingEnabled: true,
                      });
                    }}
                    disabled={configMutation.isPending}
                  >
                    {configMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickData?.stats.clicks || 0}</div>
                <p className="text-xs text-muted-foreground">Offer clicks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickData?.stats.completions || 0}</div>
                <p className="text-xs text-muted-foreground">User completions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickData?.stats.conversions || 0}</div>
                <p className="text-xs text-muted-foreground">Approved conversions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickData?.stats.conversionRate.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">Conversion percentage</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Details */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="clicks">Clicks</TabsTrigger>
              <TabsTrigger value="completions">Completions</TabsTrigger>
              <TabsTrigger value="postbacks">Postbacks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clicks">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Clicks</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {clickLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Click ID</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Clicked At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clickData?.clicks.map((click) => (
                            <TableRow key={click.id}>
                              <TableCell className="font-mono text-xs">{click.clickId.substring(0, 12)}...</TableCell>
                              <TableCell>{click.userId || "—"}</TableCell>
                              <TableCell>{click.country || "—"}</TableCell>
                              <TableCell className="text-xs">{click.ipAddress || "—"}</TableCell>
                              <TableCell className="text-xs">{new Date(click.clickedAt).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completions">
              <Card>
                <CardHeader>
                  <CardTitle>Completions</CardTitle>
                </CardHeader>
                <CardContent>
                  {completionLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Completion ID</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {completionData?.completions.map((completion) => (
                            <TableRow key={completion.id}>
                              <TableCell className="font-mono text-xs">{completion.completionId.substring(0, 12)}...</TableCell>
                              <TableCell>{completion.userId}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    completion.status === "approved"
                                      ? "default"
                                      : completion.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {completion.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{completion.pointsAwarded}</TableCell>
                              <TableCell>${completion.conversionValue || "—"}</TableCell>
                              <TableCell>
                                {completion.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          completionId: completion.id,
                                          status: "approved",
                                        })
                                      }
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          completionId: completion.id,
                                          status: "rejected",
                                        })
                                      }
                                      disabled={updateStatusMutation.isPending}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="postbacks">
              <Card>
                <CardHeader>
                  <CardTitle>Postback Delivery Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {postbackLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{postbackStats?.total || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-green-50">
                        <p className="text-sm text-muted-foreground">Success</p>
                        <p className="text-2xl font-bold text-green-600">{postbackStats?.success || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-yellow-50">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{postbackStats?.pending || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-red-50">
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{postbackStats?.failed || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">
                          {postbackStats?.total ? ((postbackStats.success / postbackStats.total) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
