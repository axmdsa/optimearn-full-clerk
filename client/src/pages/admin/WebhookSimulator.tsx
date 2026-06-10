import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Check, Copy, Send, Zap, TestTube, Code } from "lucide-react";

interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  responseBody?: string;
  error?: string;
  signature?: string;
  timestamp?: number;
}

export default function WebhookSimulator() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sample webhook payload
  const samplePayload = {
    completion_id: "comp_" + Math.random().toString(36).substr(2, 9),
    click_id: "click_" + Math.random().toString(36).substr(2, 9),
    user_id: "user_" + Math.random().toString(36).substr(2, 9),
    points: Math.floor(Math.random() * 500) + 50,
    conversion_value: (Math.random() * 10 + 0.5).toFixed(2),
    status: "approved",
    timestamp: Math.floor(Date.now() / 1000),
    custom_data: {
      campaign_id: "summer_2024",
      source: "email",
    },
  };

  // Generate HMAC-SHA256 signature
  const generateSignature = async (payload: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, data);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Build canonical payload for signing
  const buildCanonicalPayload = (data: typeof samplePayload, timestamp: number): string => {
    const params = [
      `completion_id=${data.completion_id}`,
      `click_id=${data.click_id}`,
      `user_id=${data.user_id}`,
      `points=${data.points}`,
      `conversion_value=${data.conversion_value}`,
      `status=${data.status}`,
      `timestamp=${timestamp}`,
    ];
    return params.sort().join("&");
  };

  // Send test webhook
  const handleSendTestWebhook = async () => {
    if (!webhookUrl) {
      setTestResult({
        success: false,
        error: "Please enter a webhook URL",
      });
      return;
    }

    if (!webhookSecret) {
      setTestResult({
        success: false,
        error: "Please enter your webhook secret for signature generation",
      });
      return;
    }

    setIsLoading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const canonicalPayload = buildCanonicalPayload(samplePayload, timestamp);
      const signature = await generateSignature(canonicalPayload, webhookSecret);

      const startTime = performance.now();
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp.toString(),
        },
        body: JSON.stringify(samplePayload),
      });

      const responseTime = Math.round(performance.now() - startTime);
      const responseBody = await response.text();

      setTestResult({
        success: response.ok,
        statusCode: response.status,
        responseTime,
        responseBody,
        signature,
        timestamp,
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <TestTube className="w-8 h-8" />
          Webhook Simulator
        </h1>
        <p className="text-muted-foreground">Test your webhook endpoint with generated signatures and sample payloads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Test Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-primary break-all">www.optimearn.com/api/webhooks/postback</div>
            <p className="text-xs text-muted-foreground mt-1">Your webhook receiver URL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Code className="w-4 h-4" />
              Signature Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-primary">HMAC-SHA256</div>
            <p className="text-xs text-muted-foreground mt-1">X-Webhook-Signature header</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Webhook URL</label>
                <Input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={isLoading}
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be HTTPS and publicly accessible</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Webhook Secret</label>
                <Input
                  type="password"
                  placeholder="Your webhook secret"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  disabled={isLoading}
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">For HMAC-SHA256 signature</p>
              </div>

              <Button onClick={handleSendTestWebhook} disabled={isLoading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? "Sending..." : "Send Test Webhook"}
              </Button>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card className={testResult.success ? "border-green-500/30" : "border-red-500/30"}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <Check className="w-5 h-5 text-green-500" />
                      Success
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {testResult.statusCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status Code:</span>
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.statusCode}
                    </Badge>
                  </div>
                )}

                {testResult.responseTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Time:</span>
                    <span className="text-sm font-mono">{testResult.responseTime}ms</span>
                  </div>
                )}

                {testResult.error && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                    {testResult.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payload & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sample Payload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sample Payload</CardTitle>
              <CardDescription>This is the test data that will be sent to your webhook</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-secondary/50 border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-48">
                <pre className="text-gray-300">{JSON.stringify(samplePayload, null, 2)}</pre>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2), "payload")}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copiedField === "payload" ? "Copied!" : "Copy Payload"}
              </Button>
            </CardContent>
          </Card>

          {/* Signature Details */}
          {testResult && testResult.signature && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signature Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">X-Webhook-Signature</label>
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs overflow-auto max-h-24 flex items-center justify-between gap-2">
                    <span className="text-gray-300 break-all">{testResult.signature}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(testResult.signature!, "signature")}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">X-Webhook-Timestamp</label>
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs">
                    {testResult.timestamp}
                  </div>
                </div>

                {testResult.responseBody && (
                  <div>
                    <label className="text-sm font-medium block mb-2">Response Body</label>
                    <div className="bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs overflow-auto max-h-32">
                      <pre className="text-gray-300">{testResult.responseBody}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Integration Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Guide</CardTitle>
              <CardDescription>Example implementations for webhook verification</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="nodejs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>

                <TabsContent value="nodejs" className="space-y-3">
                  <div className="bg-secondary/50 border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-64">
                    <pre className="text-gray-300">{`const crypto = require('crypto');
const express = require('express');
const app = express();

const WEBHOOK_SECRET = 'your_webhook_secret';

app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  
  // Validate timestamp
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - parseInt(timestamp) > 300) {
    return res.status(401).json({ error: 'Request too old' });
  }
  
  // Build canonical payload
  const body = req.body;
  const payload = [
    \`completion_id=\${body.completion_id}\`,
    \`click_id=\${body.click_id}\`,
    \`user_id=\${body.user_id}\`,
    \`points=\${body.points}\`,
    \`conversion_value=\${body.conversion_value}\`,
    \`status=\${body.status}\`,
    \`timestamp=\${timestamp}\`
  ].sort().join('&');
  
  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSig, 'hex')
  )) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  console.log('Webhook verified:', body);
  res.json({ success: true });
});`}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="python" className="space-y-3">
                  <div className="bg-secondary/50 border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-64">
                    <pre className="text-gray-300">{`import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret'

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    
    # Validate timestamp
    import time
    current_time = int(time.time())
    if current_time - int(timestamp) > 300:
        return {'error': 'Request too old'}, 401
    
    # Get request body
    body = request.get_json()
    
    # Build canonical payload
    params = [
        f"completion_id={body['completion_id']}",
        f"click_id={body['click_id']}",
        f"user_id={body['user_id']}",
        f"points={body['points']}",
        f"conversion_value={body['conversion_value']}",
        f"status={body['status']}",
        f"timestamp={timestamp}"
    ]
    payload = '&'.join(sorted(params))
    
    # Verify signature
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_sig):
        return {'error': 'Invalid signature'}, 401
    
    # Process webhook
    print(f'Webhook verified: {body}')
    return {'success': True}, 200

if __name__ == '__main__':
    app.run(port=3000)`}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
