import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, Copy, Check, ChevronDown, ChevronUp, Network, Zap, Shield, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NetworkSetupWizard } from "./NetworkSetupWizard";

type NetworkForm = {
  name: string;
  webhookUrl: string;
  webhookSecret: string;
  postbackTypes: string;
  description: string;
  isActive: boolean;
  subIdParamName: string;
  supportedMacros: string;
  customMacros: string;
  postbackFormat: "url_encoded" | "json" | "query_params";
  postbackMethod: "POST" | "GET";
  macroFieldMapping: string;
};

const defaultForm: NetworkForm = {
  name: '',
  webhookUrl: '',
  webhookSecret: '',
  postbackTypes: 'pending,approved,rejected',
  description: '',
  isActive: true,
  subIdParamName: 'subid',
  supportedMacros: JSON.stringify([
    { name: 'subid', field: 'clickId', description: 'Click ID / SubID' },
    { name: 'status', field: 'status', description: 'Conversion Status' },
    { name: 'payout', field: 'payout', description: 'Payout Amount' },
    { name: 'transaction_id', field: 'transactionId', description: 'Transaction ID' },
  ]),
  customMacros: '[]',
  postbackFormat: 'url_encoded',
  postbackMethod: 'POST',
  macroFieldMapping: JSON.stringify({
    subid: 'clickId',
    status: 'status',
    payout: 'payout',
    transaction_id: 'transactionId',
  }),
};

const PREDEFINED_SUBID_PARAMS = ['s1', 'subid', 'aff_sub', 'clickid', 'sub', 'sid', 'click_id', 'conversion_id'];
const PREDEFINED_MACROS = [
  { name: 'subid', field: 'clickId', description: 'Click ID / SubID' },
  { name: 'status', field: 'status', description: 'Conversion Status (pending/approved/rejected)' },
  { name: 'payout', field: 'payout', description: 'Payout Amount' },
  { name: 'transaction_id', field: 'transactionId', description: 'Transaction ID' },
  { name: 'currency', field: 'currency', description: 'Currency Code' },
  { name: 'timestamp', field: 'timestamp', description: 'Conversion Timestamp' },
];

function NetworkConfigurationModal({ network, onClose }: { network?: any; onClose: () => void }) {
  const [form, setForm] = useState<NetworkForm>(network ? {
    name: network.name,
    webhookUrl: network.webhookUrl,
    webhookSecret: network.webhookSecret,
    postbackTypes: network.postbackTypes || 'pending,approved,rejected',
    description: network.description || '',
    isActive: network.isActive,
    subIdParamName: network.subIdParamName || 'subid',
    supportedMacros: network.supportedMacros || JSON.stringify(PREDEFINED_MACROS.slice(0, 4)),
    customMacros: network.customMacros || '[]',
    postbackFormat: network.postbackFormat || 'url_encoded',
    postbackMethod: network.postbackMethod || 'POST',
    macroFieldMapping: network.macroFieldMapping || JSON.stringify({
      subid: 'clickId',
      status: 'status',
      payout: 'payout',
      transaction_id: 'transactionId',
    }),
  } : defaultForm);

  const [expandedSection, setExpandedSection] = useState<string>('basic');
  const [customMacroInput, setCustomMacroInput] = useState('');

  const utils = trpc.useUtils();
  const createNetwork = trpc.admin.networks.create.useMutation({
    onSuccess: () => {
      toast.success("Network created!");
      utils.admin.networks.list.invalidate();
      onClose();
    },
    onError: () => toast.error("Failed to create network"),
  });

  const updateNetwork = trpc.admin.networks.update.useMutation({
    onSuccess: () => {
      toast.success("Network updated!");
      utils.admin.networks.list.invalidate();
      onClose();
    },
    onError: () => toast.error("Failed to update network"),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Network name is required");
    if (!form.webhookUrl.trim()) return toast.error("Webhook URL is required");
    if (!form.webhookSecret.trim()) return toast.error("Webhook secret is required");

    if (network) {
      updateNetwork.mutate({ networkId: network.id, ...form });
    } else {
      createNetwork.mutate(form);
    }
  };

  const addCustomMacro = () => {
    if (!customMacroInput.trim()) return;
    try {
      const customMacros = JSON.parse(form.customMacros || '[]');
      customMacros.push({
        name: customMacroInput,
        description: `Custom macro: ${customMacroInput}`,
      });
      setForm(f => ({ ...f, customMacros: JSON.stringify(customMacros) }));
      setCustomMacroInput('');
      toast.success("Custom macro added!");
    } catch (e) {
      toast.error("Failed to add custom macro");
    }
  };

  const removeCustomMacro = (index: number) => {
    try {
      const customMacros = JSON.parse(form.customMacros || '[]');
      customMacros.splice(index, 1);
      setForm(f => ({ ...f, customMacros: JSON.stringify(customMacros) }));
    } catch (e) {
      toast.error("Failed to remove custom macro");
    }
  };

  const toggleMacroSupport = (macroName: string) => {
    try {
      const supported = JSON.parse(form.supportedMacros || '[]');
      const index = supported.findIndex((m: any) => m.name === macroName);
      if (index >= 0) {
        supported.splice(index, 1);
      } else {
        const predefined = PREDEFINED_MACROS.find(m => m.name === macroName);
        if (predefined) supported.push(predefined);
      }
      setForm(f => ({ ...f, supportedMacros: JSON.stringify(supported) }));
    } catch (e) {
      toast.error("Failed to update macro support");
    }
  };

  const isPending = createNetwork.isPending || updateNetwork.isPending;
  const supportedMacros = JSON.parse(form.supportedMacros || '[]');
  const customMacros = JSON.parse(form.customMacros || '[]');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{network ? 'Edit Network' : 'Add Network'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Settings */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'basic' ? '' : 'basic')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <h3 className="text-white font-semibold">Basic Settings</h3>
              {expandedSection === 'basic' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'basic' && (
              <div className="p-4 border-t border-border space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Network Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g., CPA.com, Adgate, Offertoro" />
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Webhook URL *</label>
                  <input value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                    placeholder="https://network.com/postback" />
                  <p className="text-gray-500 text-xs mt-1">Default postback URL for this network</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Webhook Secret *</label>
                  <input value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 font-mono text-xs"
                    placeholder="Secret for HMAC-SHA256 signature" />
                  <p className="text-gray-500 text-xs mt-1">Used to verify postback signatures</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Postback Types</label>
                  <input value={form.postbackTypes} onChange={e => setForm(f => ({ ...f, postbackTypes: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                    placeholder="pending,approved,rejected" />
                  <p className="text-gray-500 text-xs mt-1">Comma-separated postback statuses this network sends</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
                    placeholder="Optional notes about this network..." />
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-border" />
                  <label className="text-gray-400 text-sm">Active</label>
                </div>
              </div>
            )}
          </div>

          {/* SubID Configuration */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'subid' ? '' : 'subid')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <h3 className="text-white font-semibold">SubID Configuration</h3>
              {expandedSection === 'subid' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'subid' && (
              <div className="p-4 border-t border-border space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">SubID Parameter Name</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {PREDEFINED_SUBID_PARAMS.map(param => (
                      <button
                        key={param}
                        onClick={() => setForm(f => ({ ...f, subIdParamName: param }))}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          form.subIdParamName === param
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-gray-400 hover:bg-secondary/80'
                        }`}
                      >
                        &{param}=
                      </button>
                    ))}
                  </div>
                  <input
                    value={form.subIdParamName}
                    onChange={e => setForm(f => ({ ...f, subIdParamName: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Or enter custom parameter name"
                  />
                  <p className="text-gray-500 text-xs mt-2">Example: https://offer.com?{form.subIdParamName}=CLICK_ID</p>
                </div>
              </div>
            )}
          </div>

          {/* Macro Configuration */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'macros' ? '' : 'macros')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <h3 className="text-white font-semibold">Macro Configuration</h3>
              {expandedSection === 'macros' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'macros' && (
              <div className="p-4 border-t border-border space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Supported Macros</label>
                  <div className="space-y-2">
                    {PREDEFINED_MACROS.map(macro => {
                      const isSupported = supportedMacros.some((m: any) => m.name === macro.name);
                      return (
                        <label key={macro.name} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSupported}
                            onChange={() => toggleMacroSupport(macro.name)}
                            className="w-4 h-4 rounded border-border"
                          />
                          <div className="flex-1">
                            <p className="text-white text-sm font-mono">{`{${macro.name}}`}</p>
                            <p className="text-gray-500 text-xs">{macro.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Custom Macros</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={customMacroInput}
                      onChange={e => setCustomMacroInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addCustomMacro()}
                      className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                      placeholder="Add custom macro name (e.g., custom_field)"
                    />
                    <Button onClick={addCustomMacro} size="sm">Add</Button>
                  </div>
                  {customMacros.length > 0 && (
                    <div className="space-y-2">
                      {customMacros.map((macro: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                          <p className="text-white text-sm font-mono">{`{${macro.name}}`}</p>
                          <button
                            onClick={() => removeCustomMacro(idx)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Postback Format */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'format' ? '' : 'format')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <h3 className="text-white font-semibold">Postback Format</h3>
              {expandedSection === 'format' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'format' && (
              <div className="p-4 border-t border-border space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Format Type</label>
                  <div className="flex gap-2">
                    {(['url_encoded', 'json', 'query_params'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setForm(f => ({ ...f, postbackFormat: fmt }))}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          form.postbackFormat === fmt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-gray-400 hover:bg-secondary/80'
                        }`}
                      >
                        {fmt === 'url_encoded' ? 'URL-Encoded' : fmt === 'json' ? 'JSON' : 'Query Params'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-2 block">HTTP Method</label>
                  <div className="flex gap-2">
                    {(['POST', 'GET'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => setForm(f => ({ ...f, postbackMethod: method }))}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          form.postbackMethod === method
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-gray-400 hover:bg-secondary/80'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : network ? 'Update Network' : 'Create Network'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AffiliateNetworks() {
  const { data: networks = [] } = trpc.admin.networks.list.useQuery();
  const deleteNetwork = trpc.admin.networks.delete.useMutation({
    onSuccess: () => {
      toast.success("Network deleted!");
      trpc.useUtils().admin.networks.list.invalidate();
    },
    onError: () => toast.error("Failed to delete network"),
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);

  const handleEdit = (network: any) => {
    setSelectedNetwork(network);
    setShowModal(true);
  };

  const handleDelete = (networkId: number) => {
    if (confirm("Are you sure you want to delete this network?")) {
      deleteNetwork.mutate({ networkId });
    }
  };

  const activeNetworks = networks.filter((n: any) => n.isActive).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Affiliate Networks</h1>
        <p className="text-muted-foreground">Configure and manage affiliate network integrations with custom postback handling</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Network className="w-4 h-4" />
              Total Networks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{networks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Active Networks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeNetworks}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for postbacks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Postback URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono text-primary break-all">www.optimearn.com/api/webhooks/postback</div>
            <p className="text-xs text-muted-foreground mt-1">Webhook endpoint</p>
          </CardContent>
        </Card>
      </div>

      {/* Networks List */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Networks</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowWizard(true)} size="sm" variant="outline">
              <Wand2 className="w-4 h-4 mr-2" />
              Guided Setup
            </Button>
            <Button onClick={() => { setSelectedNetwork(null); setShowModal(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Network
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {networks.length === 0 ? (
            <div className="text-center py-12">
              <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No networks configured yet</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowWizard(true)} size="sm" variant="outline">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Guided Setup
                </Button>
                <Button onClick={() => { setSelectedNetwork(null); setShowModal(true); }} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Network
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networks.map((network: any) => (
                <Card key={network.id} className="border border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{network.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{network.description || 'No description'}</p>
                      </div>
                      <Badge variant={network.isActive ? 'default' : 'secondary'}>
                        {network.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SubID Param:</span>
                        <span className="font-mono text-primary">&{network.subIdParamName}=</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-mono text-primary capitalize">{network.postbackFormat}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="font-mono text-primary">{network.postbackMethod}</span>
                      </div>
                    </div>

                    {(() => {
                      try {
                        const macros = JSON.parse(network.supportedMacros || '[]');
                        return (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-2">Macros</p>
                            <div className="flex flex-wrap gap-1">
                              {macros.map((m: any) => (
                                <Badge key={m.name} variant="outline" className="text-xs">
                                  {`{${m.name}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(network)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(network.id)}
                        className="flex-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <NetworkConfigurationModal
          network={selectedNetwork}
          onClose={() => {
            setShowModal(false);
            setSelectedNetwork(null);
          }}
        />
      )}

      <NetworkSetupWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
}
