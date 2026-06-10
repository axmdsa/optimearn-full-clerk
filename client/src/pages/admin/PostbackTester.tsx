import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PostbackTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  response?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export default function PostbackTester() {
  const [networkId, setNetworkId] = useState<string>("1");
  const [clickId, setClickId] = useState<string>("");
  const [status, setStatus] = useState<string>("approved");
  const [sessionUuid, setSessionUuid] = useState<string>("");
  const [customParams, setCustomParams] = useState<string>("{}");
  const [testFormat, setTestFormat] = useState<string>("query");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<PostbackTestResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch available networks
  const { data: networks } = trpc.admin.getAffiliateNetworks.useQuery();
  const sendTestPostback = trpc.admin.sendTestPostback.useMutation();

  const handleTest = async () => {
    if (!clickId.trim()) {
      toast.error("Click ID is required");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await sendTestPostback.mutateAsync({
        networkId: parseInt(networkId),
        clickId: clickId.trim(),
        status: status as "pending" | "approved" | "rejected",
        sessionUuid: sessionUuid.trim() || undefined,
        customParams: testFormat === "custom" ? JSON.parse(customParams) : undefined,
        format: testFormat as "query" | "json" | "custom",
      });

      setTestResult({
        success: result.success,
        statusCode: result.statusCode,
        responseTime: Date.now() - startTime,
        response: result.response,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        toast.success("Postback test sent successfully!");
      } else {
        toast.error(`Postback test failed: ${result.error}`);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      toast.error("Failed to send postback test");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateTestClickId = () => {
    const id = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setClickId(id);
    toast.success("Generated test click ID");
  };

  const generateSessionUuid = () => {
    const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionUuid(uuid);
    toast.success("Generated session UUID");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Postback Tester</CardTitle>
          <CardDescription>
            Manually send test postbacks to verify your postback system is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Test</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="network-select">Affiliate Network</Label>
                  <Select value={networkId} onValueChange={setNetworkId}>
                    <SelectTrigger id="network-select">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks?.map((net: any) => (
                        <SelectItem key={net.id} value={net.id.toString()}>
                          {net.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="click-id">Click ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="click-id"
                      placeholder="e.g., test-click-123"
                      value={clickId}
                      onChange={(e) => setClickId(e.target.value)}
                    />
                    <Button variant="outline" onClick={generateTestClickId} size="sm">
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status-select">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="session-uuid">Session UUID (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="session-uuid"
                      placeholder="e.g., session-uuid-12345"
                      value={sessionUuid}
                      onChange={(e) => setSessionUuid(e.target.value)}
                    />
                    <Button variant="outline" onClick={generateSessionUuid} size="sm">
                      Generate
                    </Button>
                  </div>
                </div>

                <Button onClick={handleTest} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Test Postback"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="format-select">Postback Format</Label>
                  <Select value={testFormat} onValueChange={setTestFormat}>
                    <SelectTrigger id="format-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="query">Query Parameters</SelectItem>
                      <SelectItem value="json">JSON Body</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {testFormat === "custom" && (
                  <div>
                    <Label htmlFor="custom-params">Custom Parameters (JSON)</Label>
                    <Textarea
                      id="custom-params"
                      placeholder='{"network_id": 1, "click_id": "test-123", "status": "approved"}'
                      value={customParams}
                      onChange={(e) => setCustomParams(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                {testFormat !== "custom" && (
                  <>
                    <div>
                      <Label htmlFor="network-id-adv">Network ID</Label>
                      <Input
                        id="network-id-adv"
                        type="number"
                        value={networkId}
                        onChange={(e) => setNetworkId(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="click-id-adv">Click ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="click-id-adv"
                          placeholder="e.g., test-click-123"
                          value={clickId}
                          onChange={(e) => setClickId(e.target.value)}
                        />
                        <Button variant="outline" onClick={generateTestClickId} size="sm">
                          Generate
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="status-adv">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="status-adv">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="session-uuid-adv">Session UUID (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="session-uuid-adv"
                          placeholder="e.g., session-uuid-12345"
                          value={sessionUuid}
                          onChange={(e) => setSessionUuid(e.target.value)}
                        />
                        <Button variant="outline" onClick={generateSessionUuid} size="sm">
                          Generate
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleTest} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Test Postback"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Result</CardTitle>
              {testResult.success ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Success
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Failed
                </Badge>
              )}
            </div>
            <CardDescription>
              {new Date(testResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status Code</p>
                <p className="text-lg font-semibold">{testResult.statusCode || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p className="text-lg font-semibold">{testResult.responseTime || "N/A"}ms</p>
              </div>
            </div>

            {testResult.error && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">
                  <p className="font-semibold mb-1">Error</p>
                  <p className="text-sm">{testResult.error}</p>
                </AlertDescription>
              </Alert>
            )}

            {testResult.response && (
              <div>
                <p className="text-sm font-semibold mb-2">Response</p>
                <div className="bg-background/50 border border-border rounded p-3">
                  <pre className="text-xs overflow-auto max-h-48 font-mono">
                    {JSON.stringify(testResult.response, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(testResult.response, null, 2), "response")
                    }
                  >
                    {copiedField === "response" ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-1">Quick Test:</p>
            <p className="text-muted-foreground">
              Use the Quick Test tab to send a simple postback with the most common parameters. Click "Generate" to create test IDs.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Advanced Test:</p>
            <p className="text-muted-foreground">
              Use the Advanced tab to test different postback formats (Query Parameters, JSON Body, or Custom) with full control over parameters.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Click ID:</p>
            <p className="text-muted-foreground">
              Must match an existing offer completion in your database. Use the "Generate" button to create a test ID, then create a matching offer completion.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Session UUID:</p>
            <p className="text-muted-foreground">
              Optional parameter used to track the user session. Useful for testing postback tester tools that require session tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
