import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface PostbackEvent {
  id: string;
  completionId: string;
  clickId: string;
  userId: number;
  webhookUrl: string;
  status: "pending" | "success" | "failed" | "retrying";
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PostbackStats {
  totalPostbacks: number;
  successfulPostbacks: number;
  failedPostbacks: number;
  pendingPostbacks: number;
  averageResponseTime: number;
  successRate: number;
  failureReasons: { reason: string; count: number }[];
  postbacksByHour: { hour: string; success: number; failed: number }[];
}

export default function PostbackMonitoring() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all tasks for dropdown
  const { data: tasks = [] } = trpc.tasks.list.useQuery({ category: "all" });

  // Redirect if not admin
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
              You don't have permission to access postback monitoring.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data for demonstration
  const mockStats: PostbackStats = {
    totalPostbacks: 1250,
    successfulPostbacks: 1187,
    failedPostbacks: 63,
    pendingPostbacks: 0,
    averageResponseTime: 245,
    successRate: 94.96,
    failureReasons: [
      { reason: "Connection timeout", count: 28 },
      { reason: "Invalid signature", count: 15 },
      { reason: "HTTP 500 error", count: 12 },
      { reason: "DNS resolution failed", count: 8 },
    ],
    postbacksByHour: [
      { hour: "00:00", success: 45, failed: 2 },
      { hour: "01:00", success: 52, failed: 1 },
      { hour: "02:00", success: 38, failed: 3 },
      { hour: "03:00", success: 41, failed: 2 },
      { hour: "04:00", success: 48, failed: 4 },
      { hour: "05:00", success: 55, failed: 1 },
      { hour: "06:00", success: 62, failed: 2 },
      { hour: "07:00", success: 71, failed: 3 },
      { hour: "08:00", success: 85, failed: 5 },
      { hour: "09:00", success: 92, failed: 4 },
    ],
  };

  // Mock postback events
  const mockPostbacks: PostbackEvent[] = [
    {
      id: "pb_1",
      completionId: "comp_abc123",
      clickId: "click_def456",
      userId: 1001,
      webhookUrl: "https://publisher1.com/webhook",
      status: "success",
      statusCode: 200,
      responseTime: 245,
      attemptCount: 1,
      maxAttempts: 5,
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: "pb_2",
      completionId: "comp_xyz789",
      clickId: "click_ghi012",
      userId: 1002,
      webhookUrl: "https://publisher2.com/webhook",
      status: "retrying",
      statusCode: 500,
      responseTime: 5000,
      errorMessage: "HTTP 500 Internal Server Error",
      attemptCount: 2,
      maxAttempts: 5,
      nextRetryAt: new Date(Date.now() + 15 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: "pb_3",
      completionId: "comp_jkl345",
      clickId: "click_mno678",
      userId: 1003,
      webhookUrl: "https://publisher3.com/webhook",
      status: "failed",
      statusCode: 0,
      errorMessage: "Connection timeout after 10 seconds",
      attemptCount: 5,
      maxAttempts: 5,
      createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: "pb_4",
      completionId: "comp_pqr901",
      clickId: "click_stu234",
      userId: 1004,
      webhookUrl: "https://publisher4.com/webhook",
      status: "success",
      statusCode: 200,
      responseTime: 156,
      attemptCount: 1,
      maxAttempts: 5,
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
  ];

  // Filter and sort postbacks
  const filteredPostbacks = mockPostbacks
    .filter((pb) => {
      if (statusFilter !== "all" && pb.status !== statusFilter) return false;
      if (searchTerm && !pb.completionId.includes(searchTerm) && !pb.clickId.includes(searchTerm)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "slowest") return (b.responseTime || 0) - (a.responseTime || 0);
      return 0;
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "retrying":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case "retrying":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Retrying</Badge>;
      case "pending":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Postback Monitoring
        </h1>
        <p className="text-muted-foreground">Real-time monitoring of postback delivery status and performance metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Postbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStats.totalPostbacks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{mockStats.successfulPostbacks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{mockStats.failedPostbacks}</div>
            <p className="text-xs text-muted-foreground mt-1">Delivery failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStats.successRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Reliability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStats.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Logs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        {/* Timeline Chart */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Postback Delivery Timeline</CardTitle>
              <CardDescription>Success and failure rates by hour (last 10 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockStats.postbacksByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="success" stroke="#10b981" name="Successful" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure Analysis */}
        <TabsContent value="failures">
          <Card>
            <CardHeader>
              <CardTitle>Failure Analysis</CardTitle>
              <CardDescription>Top reasons for postback delivery failures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockStats.failureReasons}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="reason" angle={-45} textAnchor="end" height={80} stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name="Count" />
                </BarChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Failure Details</h4>
                {mockStats.failureReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                    <span className="text-sm">{reason.reason}</span>
                    <Badge variant="outline">{reason.count} occurrences</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Postback Delivery Logs</CardTitle>
              <CardDescription>Recent postback delivery attempts and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 flex-wrap">
                <Input
                  placeholder="Search by completion ID or click ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-64"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="slowest">Slowest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border border-border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Status</TableHead>
                      <TableHead>Completion ID</TableHead>
                      <TableHead>Webhook URL</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPostbacks.length > 0 ? (
                      filteredPostbacks.map((pb) => (
                        <TableRow key={pb.id} className="border-border hover:bg-secondary/30">
                          <TableCell>{getStatusBadge(pb.status)}</TableCell>
                          <TableCell className="font-mono text-xs">{pb.completionId}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{pb.webhookUrl}</TableCell>
                          <TableCell className="text-xs">{pb.responseTime ? `${pb.responseTime}ms` : "—"}</TableCell>
                          <TableCell className="text-xs">{pb.attemptCount}/{pb.maxAttempts}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatTime(pb.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No postbacks found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
