import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Settings, DollarSign, Users, Gift, Zap, Shield } from "lucide-react";

type SettingGroup = {
  label: string;
  icon: React.ReactNode;
  keys: { key: string; label: string; description: string; type: 'text' | 'number' | 'boolean' | 'textarea' }[];
};

const SETTING_GROUPS: SettingGroup[] = [
  {
    label: "Platform", icon: <Settings className="w-4 h-4" />,
    keys: [
      { key: "site_name", label: "Site Name", description: "The name displayed across the platform", type: "text" },
      { key: "site_tagline", label: "Tagline", description: "Short tagline shown on the landing page", type: "text" },
      { key: "maintenance_mode", label: "Maintenance Mode", description: "Disable all user-facing pages temporarily", type: "boolean" },
      { key: "registration_enabled", label: "Registration Enabled", description: "Allow new users to sign up", type: "boolean" },
    ]
  },
  {
    label: "Earnings", icon: <DollarSign className="w-4 h-4" />,
    keys: [
      { key: "min_withdrawal_points", label: "Min Withdrawal (pts)", description: "Minimum points required to redeem a reward", type: "number" },
      { key: "points_per_dollar", label: "Points Per Dollar", description: "How many points equal $1 USD", type: "number" },
      { key: "daily_bonus_max_points", label: "Daily Bonus Max Points", description: "Maximum points from the daily spin wheel", type: "number" },
      { key: "referral_bonus_points", label: "Referral Bonus Points", description: "Points awarded per successful referral", type: "number" },
    ]
  },
  {
    label: "Users", icon: <Users className="w-4 h-4" />,
    keys: [
      { key: "xp_per_task", label: "XP Per Task", description: "Base XP awarded for completing any task", type: "number" },
      { key: "level_xp_multiplier", label: "Level XP Multiplier", description: "XP required per level (level × multiplier)", type: "number" },
      { key: "streak_bonus_multiplier", label: "Streak Bonus Multiplier", description: "Bonus multiplier for daily streaks (e.g. 1.1 = 10%)", type: "number" },
    ]
  },
  {
    label: "Rewards", icon: <Gift className="w-4 h-4" />,
    keys: [
      { key: "reward_processing_days", label: "Processing Days", description: "Days to process a reward redemption", type: "number" },
      { key: "max_daily_redemptions", label: "Max Daily Redemptions", description: "Max redemptions per user per day (0 = unlimited)", type: "number" },
    ]
  },
  {
    label: "Security", icon: <Shield className="w-4 h-4" />,
    keys: [
      { key: "max_tasks_per_day", label: "Max Tasks Per Day", description: "Max tasks a user can complete per day (0 = unlimited)", type: "number" },
      { key: "fraud_detection_enabled", label: "Fraud Detection", description: "Enable automatic fraud detection for suspicious activity", type: "boolean" },
      { key: "vpn_block_enabled", label: "Block VPN Users", description: "Prevent users on VPNs from completing tasks", type: "boolean" },
    ]
  },
];

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.settings.list.useQuery();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const updateSetting = trpc.admin.settings.update.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Setting "${vars.key}" saved`);
      utils.admin.settings.list.invalidate();
      setDirty(prev => { const n = new Set(prev); n.delete(vars.key); return n; });
    },
    onError: () => toast.error("Failed to save setting"),
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setLocalSettings(map);
    }
  }, [settings]);

  const getValue = (key: string) => localSettings[key] ?? '';
  const setValue = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };
  const saveKey = (key: string) => updateSetting.mutate({ key, value: getValue(key) });

  return (
    <AdminLayout title="Platform Settings" subtitle="Configure global platform behavior">
      <div className="space-y-6 max-w-3xl">
        {dirty.size > 0 && (
          <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
            <span className="text-yellow-400 text-sm font-medium">{dirty.size} unsaved change{dirty.size !== 1 ? 's' : ''}</span>
            <button onClick={() => dirty.forEach(k => saveKey(k))} disabled={updateSetting.isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50">
              <Save className="w-3 h-3" /> Save All
            </button>
          </div>
        )}

        {SETTING_GROUPS.map(group => (
          <div key={group.label} className="bg-background border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
              <span className="text-primary">{group.icon}</span>
              <h3 className="text-white font-semibold">{group.label}</h3>
            </div>
            <div className="divide-y divide-white/5">
              {group.keys.map(setting => (
                <div key={setting.key} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{setting.label}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{setting.description}</div>
                    {isLoading && <div className="h-3 w-24 bg-secondary rounded animate-pulse mt-1" />}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {setting.type === 'boolean' ? (
                      <button onClick={() => { const newVal = getValue(setting.key) === 'true' ? 'false' : 'true'; setValue(setting.key, newVal); }}
                        className={`relative w-12 h-6 rounded-full transition-all ${getValue(setting.key) === 'true' ? 'bg-primary' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${getValue(setting.key) === 'true' ? 'left-7' : 'left-1'}`} />
                      </button>
                    ) : setting.type === 'textarea' ? (
                      <textarea value={getValue(setting.key)} onChange={e => setValue(setting.key, e.target.value)} rows={2}
                        className="w-64 bg-secondary border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" />
                    ) : (
                      <input type={setting.type === 'number' ? 'number' : 'text'} value={getValue(setting.key)} onChange={e => setValue(setting.key, e.target.value)}
                        className="w-36 bg-secondary border border-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-primary/50 text-right" />
                    )}
                    {dirty.has(setting.key) && (
                      <button onClick={() => saveKey(setting.key)} disabled={updateSetting.isPending}
                        className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all disabled:opacity-50">
                        <Save className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
