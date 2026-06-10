import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const NETWORK_TEMPLATES = {
  cpa_com: {
    name: "CPA.com",
    webhookUrlTemplate: "https://api.cpa.com/postback",
    postbackTypes: ["pending", "approved", "rejected"],
  },
  adgate: {
    name: "Adgate",
    webhookUrlTemplate: "https://postback.adgate.com/callback",
    postbackTypes: ["pending", "approved"],
  },
  offertoro: {
    name: "Offertoro",
    webhookUrlTemplate: "https://api.offertoro.com/postback",
    postbackTypes: ["approved", "rejected"],
  },
  custom: {
    name: "Custom Network",
    webhookUrlTemplate: "",
    postbackTypes: ["pending", "approved", "rejected"],
  },
};

interface WizardStep {
  step: number;
  title: string;
  description: string;
}

export function NetworkSetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    networkType: "",
    name: "",
    webhookUrl: "",
    webhookSecret: "",
    postbackTypes: [] as string[],
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const createNetwork = trpc.admin.networks.create.useMutation();

  const steps: WizardStep[] = [
    { step: 1, title: "Select Network", description: "Choose your affiliate network" },
    { step: 2, title: "Configure Webhook", description: "Set up webhook URL and secret" },
    { step: 3, title: "Select Postback Types", description: "Choose which signals to receive" },
    { step: 4, title: "Test & Confirm", description: "Test webhook delivery" },
  ];

  const handleNetworkSelect = (networkId: string) => {
    const template = NETWORK_TEMPLATES[networkId as keyof typeof NETWORK_TEMPLATES];
    setFormData({
      ...formData,
      networkType: networkId,
      name: template.name,
      webhookUrl: template.webhookUrlTemplate,
      postbackTypes: template.postbackTypes,
    });
    setCurrentStep(2);
  };

  const handleTestWebhook = async () => {
    // Simulate webhook test
    try {
      const response = await fetch(formData.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'test',
          timestamp: new Date().toISOString(),
        }),
      });
      setTestResult({
        success: response.ok,
        message: response.ok ? 'Webhook test successful!' : 'Webhook test failed',
        details: response.ok ? 'Your webhook endpoint is responding correctly' : 'Check your webhook URL',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Webhook test failed',
        details: 'Unable to reach webhook endpoint',
      });
    }
  };

  const handleCreate = async () => {
    try {
      await createNetwork.mutateAsync({
        name: formData.name,
        webhookUrl: formData.webhookUrl,
        webhookSecret: formData.webhookSecret,
        postbackTypes: formData.postbackTypes.join(','),
      });
      toast.success("Network created successfully!");
      onOpenChange(false);
      setCurrentStep(1);
      setFormData({
        networkType: "",
        name: "",
        webhookUrl: "",
        webhookSecret: "",
        postbackTypes: [],
      });
    } catch (error) {
      toast.error("Failed to create network");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Affiliate Network</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-6">
          {steps.map((s) => (
            <div key={s.step} className="flex-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  currentStep >= s.step ? "bg-primary" : "bg-secondary"
                }`}
              />
              <p className="text-xs text-muted-foreground mt-1">{s.title}</p>
            </div>
          ))}
        </div>

        {/* Step 1: Select Network */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a network or set up custom:</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(NETWORK_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleNetworkSelect(key)}
                  className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-semibold text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.postbackTypes.join(", ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configure Webhook */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Network Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CPA.com Production"
              />
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://api.example.com/postback"
              />
            </div>
            <div>
              <Label>Webhook Secret</Label>
              <Input
                type="password"
                value={formData.webhookSecret}
                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                placeholder="Your webhook secret key"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Postback Types */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Which postback signals does {formData.name} send?
            </p>
            <div className="space-y-2">
              {["pending", "approved", "rejected"].map((type) => (
                <label key={type} className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
                  <input
                    type="checkbox"
                    checked={formData.postbackTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          postbackTypes: [...formData.postbackTypes, type] as string[],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          postbackTypes: formData.postbackTypes.filter((t) => t !== type) as string[],
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-sm capitalize">{type}</p>
                    <p className="text-xs text-muted-foreground">
                      {type === "pending" && "Offer completed but not verified"}
                      {type === "approved" && "Offer verified and approved"}
                      {type === "rejected" && "Offer rejected (fraud detected)"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(4)} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Test & Confirm */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="p-4 bg-secondary/50">
              <p className="font-semibold text-sm mb-3">Configuration Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span>{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Webhook URL:</span>
                  <span className="font-mono text-xs">{formData.webhookUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postback Types:</span>
                  <div className="flex gap-1">
                    {formData.postbackTypes.map((type) => (
                      <Badge key={type} variant="outline" className="capitalize">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {testResult && (
              <Card className={`p-4 ${testResult.success ? "bg-green-500/10" : "bg-red-500/10"}`}>
                <div className="flex gap-2 items-start">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.details && (
                      <p className="text-xs text-muted-foreground mt-1">{testResult.details}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            <Button
              onClick={handleTestWebhook}
              variant="outline"
              className="w-full"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Test Webhook
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createNetwork.isPending || !testResult?.success}
                className="flex-1"
              >
                {createNetwork.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Network
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
