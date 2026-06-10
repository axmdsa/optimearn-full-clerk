import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Clock, Eye, RefreshCw } from "lucide-react";

interface PostbackLog {
  id: number;
  affiliateNetworkId: number;
  completionId: string;
  rawPayload: string;
  payloadFormat: "url_encoded" | "json" | "query_params";
  signatureProvided: string | null;
  signatureValid: boolean;
  signatureError: string | null;
  parsedData: string;
  macroMappingUsed: string;
  extractedStatus: "pending" | "approved" | "rejected";
  extractedPayout: number | null;
  httpMethod: string;
  sourceIp: string;
  userAgent: string | null;
  processingStatus: "success" | "failed" | "pending";
  processingError: string | null;
  createdAt: Date;
}

export function PostbackAuditLogs() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<PostbackLog | null>(null);
  const [filterNetwork, setFilterNetwork] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchClickId, setSearchClickId] = useState<string>("");

  // Fetch postback audit logs and stats
  const { data: logs = [], refetch } = trpc.admin.getPostbackAuditLogs.useQuery();
  const { data: stats } = trpc.admin.getPostbackAuditStats.useQuery();

  const filteredLogs = logs.filter((log: PostbackLog) => {
    if (filterNetwork !== "all" && log.affiliateNetworkId !== parseInt(filterNetwork)) return false;
    if (filterStatus !== "all" && log.processingStatus !== filterStatus) return false;
    if (searchClickId && !log.completionId.includes(searchClickId)) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSignatureIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postback Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track all incoming postbacks from affiliate networks with signature validation and processing status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Postbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPostbacks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.successfulPostbacks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats && stats.totalPostbacks > 0
                ? (((stats.successfulPostbacks / stats.totalPostbacks) * 100).toFixed(1)).toString() + "%"
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.failedPostbacks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signature Valid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.signatureValidCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Authenticated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Network</label>
              <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  <SelectItem value="1">CPA.com</SelectItem>
                  <SelectItem value="2">Adgate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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
              <label className="text-sm font-medium mb-2 block">Search Click ID</label>
              <Input
                placeholder="Enter click ID..."
                value={searchClickId}
                onChange={(e) => setSearchClickId(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Postbacks</CardTitle>
          <CardDescription>Showing {filteredLogs.length} postbacks</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No postbacks found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Click ID</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: PostbackLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.completionId.substring(0, 12)}...</TableCell>
                      <TableCell>Network {log.affiliateNetworkId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.processingStatus)}
                          <Badge
                            variant={
                              log.processingStatus === "success"
                                ? "default"
                                : log.processingStatus === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {log.processingStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSignatureIcon(log.signatureValid)}
                          {log.signatureValid ? "Valid" : "Invalid"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.payloadFormat}</TableCell>
                      <TableCell className="font-mono text-sm">{log.sourceIp}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Postback Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="h-full">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="signature">Signature</TabsTrigger>
                  <TabsTrigger value="error">Error</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Click ID</p>
                      <p className="font-mono text-sm mt-1">{selectedLog.completionId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Network ID</p>
                      <p className="text-sm mt-1">{selectedLog.affiliateNetworkId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Processing Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedLog.processingStatus)}
                        <Badge
                          variant={
                            selectedLog.processingStatus === "success"
                              ? "default"
                              : selectedLog.processingStatus === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {selectedLog.processingStatus}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Extracted Status</p>
                      <p className="text-sm mt-1 capitalize">{selectedLog.extractedStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payload Format</p>
                      <p className="text-sm mt-1">{selectedLog.payloadFormat}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">HTTP Method</p>
                      <p className="text-sm mt-1">{selectedLog.httpMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Source IP</p>
                      <p className="font-mono text-sm mt-1">{selectedLog.sourceIp}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Extracted Payout</p>
                      <p className="text-sm mt-1">${selectedLog.extractedPayout?.toFixed(2) || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                      <p className="text-sm mt-1">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payload" className="p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Raw Payload</p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {selectedLog.rawPayload}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Parsed Data</p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(JSON.parse(selectedLog.parsedData || "{}"), null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Macro Mapping Used</p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(JSON.parse(selectedLog.macroMappingUsed || "{}"), null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="signature" className="p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Signature Valid</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getSignatureIcon(selectedLog.signatureValid)}
                        <span className="text-sm">{selectedLog.signatureValid ? "Valid" : "Invalid"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Signature Provided</p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                        {selectedLog.signatureProvided || "None"}
                      </pre>
                    </div>
                    {selectedLog.signatureError && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Signature Error</p>
                        <p className="text-sm text-red-600">{selectedLog.signatureError}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="error" className="p-4">
                  {selectedLog.processingError ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Error Message</p>
                      <p className="text-sm text-red-600">{selectedLog.processingError}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No errors</p>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
