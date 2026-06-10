import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getInitials } from "@shared/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { User, Star, Trophy, Flame, Zap, CheckCircle2, Award, Edit2, Save, X } from "lucide-react";
import { useState } from "react";

// Country code to flag emoji mapping - Complete list of all countries
const countryCodeToFlag: Record<string, string> = {
  'AD': '🇦🇩', 'AE': '🇦🇪', 'AF': '🇦🇫', 'AG': '🇦🇬', 'AI': '🇦🇮', 'AL': '🇦🇱', 'AM': '🇦🇲', 'AO': '🇦🇴', 'AQ': '🇦🇶', 'AR': '🇦🇷', 'AS': '🇦🇸', 'AT': '🇦🇹', 'AU': '🇦🇺', 'AW': '🇦🇼', 'AX': '🇦🇽', 'AZ': '🇦🇿',
  'BA': '🇧🇦', 'BB': '🇧🇧', 'BD': '🇧🇩', 'BE': '🇧🇪', 'BF': '🇧🇫', 'BG': '🇧🇬', 'BH': '🇧🇭', 'BI': '🇧🇮', 'BJ': '🇧🇯', 'BL': '🇧🇱', 'BM': '🇧🇲', 'BN': '🇧🇳', 'BO': '🇧🇴', 'BQ': '🇧🇶', 'BR': '🇧🇷', 'BS': '🇧🇸',
  'BT': '🇧🇹', 'BV': '🇧🇻', 'BW': '🇧🇼', 'BY': '🇧🇾', 'BZ': '🇧🇿', 'CA': '🇨🇦', 'CC': '🇨🇨', 'CD': '🇨🇩', 'CF': '🇨🇫', 'CG': '🇨🇬', 'CH': '🇨🇭', 'CI': '🇨🇮', 'CK': '🇨🇰', 'CL': '🇨🇱', 'CM': '🇨🇲', 'CN': '🇨🇳',
  'CO': '🇨🇴', 'CR': '🇨🇷', 'CU': '🇨🇺', 'CV': '🇨🇻', 'CW': '🇨🇼', 'CX': '🇨🇽', 'CY': '🇨🇾', 'CZ': '🇨🇿', 'DE': '🇩🇪', 'DJ': '🇩🇯', 'DK': '🇩🇰', 'DM': '🇩🇲', 'DO': '🇩🇴', 'DZ': '🇩🇿', 'EC': '🇪🇨', 'EE': '🇪🇪',
  'EG': '🇪🇬', 'EH': '🇪🇭', 'ER': '🇪🇷', 'ES': '🇪🇸', 'ET': '🇪🇹', 'FI': '🇫🇮', 'FJ': '🇫🇯', 'FK': '🇫🇰', 'FM': '🇫🇲', 'FO': '🇫🇴', 'FR': '🇫🇷', 'GA': '🇬🇦', 'GB': '🇬🇧', 'GD': '🇬🇩', 'GE': '🇬🇪', 'GF': '🇬🇫',
  'GG': '🇬🇬', 'GH': '🇬🇭', 'GI': '🇬🇮', 'GL': '🇬🇱', 'GM': '🇬🇲', 'GN': '🇬🇳', 'GP': '🇬🇵', 'GQ': '🇬🇶', 'GR': '🇬🇷', 'GS': '🇬🇸', 'GT': '🇬🇹', 'GU': '🇬🇺', 'GW': '🇬🇼', 'GY': '🇬🇾', 'HK': '🇭🇰', 'HM': '🇭🇲',
  'HN': '🇭🇳', 'HR': '🇭🇷', 'HT': '🇭🇹', 'HU': '🇭🇺', 'ID': '🇮🇩', 'IE': '🇮🇪', 'IL': '🇮🇱', 'IM': '🇮🇲', 'IN': '🇮🇳', 'IO': '🇮🇴', 'IQ': '🇮🇶', 'IR': '🇮🇷', 'IS': '🇮🇸', 'IT': '🇮🇹', 'JE': '🇯🇪', 'JM': '🇯🇲',
  'JO': '🇯🇴', 'JP': '🇯🇵', 'KE': '🇰🇪', 'KG': '🇰🇬', 'KH': '🇰🇭', 'KI': '🇰🇮', 'KM': '🇰🇲', 'KN': '🇰🇳', 'KP': '🇰🇵', 'KR': '🇰🇷', 'KW': '🇰🇼', 'KY': '🇰🇾', 'KZ': '🇰🇿', 'LA': '🇱🇦', 'LB': '🇱🇧', 'LC': '🇱🇨',
  'LI': '🇱🇮', 'LK': '🇱🇰', 'LR': '🇱🇷', 'LS': '🇱🇸', 'LT': '🇱🇹', 'LU': '🇱🇺', 'LV': '🇱🇻', 'LY': '🇱🇾', 'MA': '🇲🇦', 'MC': '🇲🇨', 'MD': '🇲🇩', 'ME': '🇲🇪', 'MF': '🇲🇫', 'MG': '🇲🇬', 'MH': '🇲🇭', 'MK': '🇲🇰',
  'ML': '🇲🇱', 'MM': '🇲🇲', 'MN': '🇲🇳', 'MO': '🇲🇴', 'MP': '🇲🇵', 'MQ': '🇲🇶', 'MR': '🇲🇷', 'MS': '🇲🇸', 'MT': '🇲🇹', 'MU': '🇲🇺', 'MV': '🇲🇻', 'MW': '🇲🇼', 'MX': '🇲🇽', 'MY': '🇲🇾', 'MZ': '🇲🇿', 'NA': '🇳🇦',
  'NC': '🇳🇨', 'NE': '🇳🇪', 'NF': '🇳🇫', 'NG': '🇳🇬', 'NI': '🇳🇮', 'NL': '🇳🇱', 'NO': '🇳🇴', 'NP': '🇳🇵', 'NR': '🇳🇷', 'NU': '🇳🇺', 'NZ': '🇳🇿', 'OM': '🇴🇲', 'PA': '🇵🇦', 'PE': '🇵🇪', 'PF': '🇵🇫', 'PG': '🇵🇬',
  'PH': '🇵🇭', 'PK': '🇵🇰', 'PL': '🇵🇱', 'PM': '🇵🇲', 'PN': '🇵🇳', 'PR': '🇵🇷', 'PS': '🇵🇸', 'PT': '🇵🇹', 'PW': '🇵🇼', 'PY': '🇵🇾', 'QA': '🇶🇦', 'RE': '🇷🇪', 'RO': '🇷🇴', 'RS': '🇷🇸', 'RU': '🇷🇺', 'RW': '🇷🇼',
  'SA': '🇸🇦', 'SB': '🇸🇧', 'SC': '🇸🇨', 'SD': '🇸🇩', 'SE': '🇸🇪', 'SG': '🇸🇬', 'SH': '🇸🇭', 'SI': '🇸🇮', 'SJ': '🇸🇯', 'SK': '🇸🇰', 'SL': '🇸🇱', 'SM': '🇸🇲', 'SN': '🇸🇳', 'SO': '🇸🇴', 'SR': '🇸🇷', 'SS': '🇸🇸',
  'ST': '🇸🇹', 'SV': '🇸🇻', 'SX': '🇸🇽', 'SY': '🇸🇾', 'SZ': '🇸🇿', 'TC': '🇹🇨', 'TD': '🇹🇩', 'TF': '🇹🇫', 'TG': '🇹🇬', 'TH': '🇹🇭', 'TJ': '🇹🇯', 'TK': '🇹🇰', 'TL': '🇹🇱', 'TM': '🇹🇲', 'TN': '🇹🇳', 'TO': '🇹🇴',
  'TR': '🇹🇷', 'TT': '🇹🇹', 'TV': '🇹🇻', 'TW': '🇹🇼', 'TZ': '🇹🇿', 'UA': '🇺🇦', 'UG': '🇺🇬', 'UM': '🇺🇲', 'US': '🇺🇸', 'UY': '🇺🇾', 'UZ': '🇺🇿', 'VA': '🇻🇦', 'VC': '🇻🇨', 'VE': '🇻🇪', 'VG': '🇻🇬', 'VI': '🇻🇮',
  'VN': '🇻🇳', 'VU': '🇻🇺', 'WF': '🇼🇫', 'WS': '🇼🇸', 'YE': '🇾🇪', 'YT': '🇾🇹', 'ZA': '🇿🇦', 'ZM': '🇿🇲', 'ZW': '🇿🇼',
};

const countryCodeToName: Record<string, string> = {
  'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua and Barbuda', 'AI': 'Anguilla', 'AL': 'Albania', 'AM': 'Armenia', 'AO': 'Angola', 'AQ': 'Antarctica', 'AR': 'Argentina', 'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba', 'AX': 'Åland Islands', 'AZ': 'Azerbaijan',
  'BA': 'Bosnia and Herzegovina', 'BB': 'Barbados', 'BD': 'Bangladesh', 'BE': 'Belgium', 'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain', 'BI': 'Burundi', 'BJ': 'Benin', 'BL': 'Saint Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei', 'BO': 'Bolivia', 'BQ': 'Bonaire', 'BR': 'Brazil', 'BS': 'Bahamas',
  'BT': 'Bhutan', 'BV': 'Bouvet Island', 'BW': 'Botswana', 'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada', 'CC': 'Cocos Islands', 'CD': 'Democratic Republic of Congo', 'CF': 'Central African Republic', 'CG': 'Congo', 'CH': 'Switzerland', 'CI': 'Côte d\'Ivoire', 'CK': 'Cook Islands', 'CL': 'Chile', 'CM': 'Cameroon', 'CN': 'China',
  'CO': 'Colombia', 'CR': 'Costa Rica', 'CU': 'Cuba', 'CV': 'Cape Verde', 'CW': 'Curaçao', 'CX': 'Christmas Island', 'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DE': 'Germany', 'DJ': 'Djibouti', 'DK': 'Denmark', 'DM': 'Dominica', 'DO': 'Dominican Republic', 'DZ': 'Algeria', 'EC': 'Ecuador', 'EE': 'Estonia',
  'EG': 'Egypt', 'EH': 'Western Sahara', 'ER': 'Eritrea', 'ES': 'Spain', 'ET': 'Ethiopia', 'FI': 'Finland', 'FJ': 'Fiji', 'FK': 'Falkland Islands', 'FM': 'Micronesia', 'FO': 'Faroe Islands', 'FR': 'France', 'GA': 'Gabon', 'GB': 'United Kingdom', 'GD': 'Grenada', 'GE': 'Georgia', 'GF': 'French Guiana',
  'GG': 'Guernsey', 'GH': 'Ghana', 'GI': 'Gibraltar', 'GL': 'Greenland', 'GM': 'Gambia', 'GN': 'Guinea', 'GP': 'Guadeloupe', 'GQ': 'Equatorial Guinea', 'GR': 'Greece', 'GS': 'South Georgia', 'GT': 'Guatemala', 'GU': 'Guam', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HK': 'Hong Kong', 'HM': 'Heard Island',
  'HN': 'Honduras', 'HR': 'Croatia', 'HT': 'Haiti', 'HU': 'Hungary', 'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel', 'IM': 'Isle of Man', 'IN': 'India', 'IO': 'British Indian Ocean Territory', 'IQ': 'Iraq', 'IR': 'Iran', 'IS': 'Iceland', 'IT': 'Italy', 'JE': 'Jersey', 'JM': 'Jamaica',
  'JO': 'Jordan', 'JP': 'Japan', 'KE': 'Kenya', 'KG': 'Kyrgyzstan', 'KH': 'Cambodia', 'KI': 'Kiribati', 'KM': 'Comoros', 'KN': 'Saint Kitts and Nevis', 'KP': 'North Korea', 'KR': 'South Korea', 'KW': 'Kuwait', 'KY': 'Cayman Islands', 'KZ': 'Kazakhstan', 'LA': 'Laos', 'LB': 'Lebanon', 'LC': 'Saint Lucia',
  'LI': 'Liechtenstein', 'LK': 'Sri Lanka', 'LR': 'Liberia', 'LS': 'Lesotho', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia', 'LY': 'Libya', 'MA': 'Morocco', 'MC': 'Monaco', 'MD': 'Moldova', 'ME': 'Montenegro', 'MF': 'Saint Martin', 'MG': 'Madagascar', 'MH': 'Marshall Islands', 'MK': 'North Macedonia',
  'ML': 'Mali', 'MM': 'Myanmar', 'MN': 'Mongolia', 'MO': 'Macao', 'MP': 'Northern Mariana Islands', 'MQ': 'Martinique', 'MR': 'Mauritania', 'MS': 'Montserrat', 'MT': 'Malta', 'MU': 'Mauritius', 'MV': 'Maldives', 'MW': 'Malawi', 'MX': 'Mexico', 'MY': 'Malaysia', 'MZ': 'Mozambique', 'NA': 'Namibia',
  'NC': 'New Caledonia', 'NE': 'Niger', 'NF': 'Norfolk Island', 'NG': 'Nigeria', 'NI': 'Nicaragua', 'NL': 'Netherlands', 'NO': 'Norway', 'NP': 'Nepal', 'NR': 'Nauru', 'NU': 'Niue', 'NZ': 'New Zealand', 'OM': 'Oman', 'PA': 'Panama', 'PE': 'Peru', 'PF': 'French Polynesia', 'PG': 'Papua New Guinea',
  'PH': 'Philippines', 'PK': 'Pakistan', 'PL': 'Poland', 'PM': 'Saint Pierre and Miquelon', 'PN': 'Pitcairn Islands', 'PR': 'Puerto Rico', 'PS': 'Palestine', 'PT': 'Portugal', 'PW': 'Palau', 'PY': 'Paraguay', 'QA': 'Qatar', 'RE': 'Réunion', 'RO': 'Romania', 'RS': 'Serbia', 'RU': 'Russia', 'RW': 'Rwanda',
  'SA': 'Saudi Arabia', 'SB': 'Solomon Islands', 'SC': 'Seychelles', 'SD': 'Sudan', 'SE': 'Sweden', 'SG': 'Singapore', 'SH': 'Saint Helena', 'SI': 'Slovenia', 'SJ': 'Svalbard and Jan Mayen', 'SK': 'Slovakia', 'SL': 'Sierra Leone', 'SM': 'San Marino', 'SN': 'Senegal', 'SO': 'Somalia', 'SR': 'Suriname', 'SS': 'South Sudan',
  'ST': 'São Tomé and Príncipe', 'SV': 'El Salvador', 'SX': 'Sint Maarten', 'SY': 'Syria', 'SZ': 'Eswatini', 'TC': 'Turks and Caicos Islands', 'TD': 'Chad', 'TF': 'French Southern Territories', 'TG': 'Togo', 'TH': 'Thailand', 'TJ': 'Tajikistan', 'TK': 'Tokelau', 'TL': 'Timor-Leste', 'TM': 'Turkmenistan', 'TN': 'Tunisia', 'TO': 'Tonga',
  'TR': 'Turkey', 'TT': 'Trinidad and Tobago', 'TV': 'Tuvalu', 'TW': 'Taiwan', 'TZ': 'Tanzania', 'UA': 'Ukraine', 'UG': 'Uganda', 'UM': 'U.S. Minor Islands', 'US': 'United States', 'UY': 'Uruguay', 'UZ': 'Uzbekistan', 'VA': 'Vatican City', 'VC': 'Saint Vincent and the Grenadines', 'VE': 'Venezuela', 'VG': 'British Virgin Islands', 'VI': 'U.S. Virgin Islands',
  'VN': 'Vietnam', 'VU': 'Vanuatu', 'WF': 'Wallis and Futuna', 'WS': 'Samoa', 'YE': 'Yemen', 'YT': 'Mayotte', 'ZA': 'South Africa', 'ZM': 'Zambia', 'ZW': 'Zimbabwe',
};

function getCountryFlag(countryCode?: string): string {
  if (!countryCode) return '🌍';
  return countryCodeToFlag[countryCode.toUpperCase()] || '🌍';
}

function getCountryName(countryCode?: string): string {
  if (!countryCode) return 'Unknown';
  return countryCodeToName[countryCode.toUpperCase()] || countryCode.toUpperCase();
}

export default function Profile() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const { data: stats } = trpc.user.getStats.useQuery();
  const { data: userAchievements } = trpc.achievements.mine.useQuery();
  const { data: loginHistory } = trpc.user.getLoginHistory.useQuery({ limit: 10 });
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated!');
      utils.user.getProfile.invalidate();
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState('');

  const startEdit = () => {
    setNameInput(profile?.name ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
    if (!nameInput.trim()) return;
    updateProfile.mutate({ name: nameInput.trim() });
  };

  const startAvatarEdit = () => {
    setAvatarInput(profile?.avatarUrl ?? '');
    setEditingAvatar(true);
  };

  const saveAvatarEdit = () => {
    if (!avatarInput.trim()) {
      updateProfile.mutate({ avatarUrl: '' });
      setEditingAvatar(false);
      return;
    }
    updateProfile.mutate({ avatarUrl: avatarInput.trim() });
    setEditingAvatar(false);
  };

  const xpPercent = profile ? Math.round((profile.xp / profile.xpToNextLevel) * 100) : 0;

  type UA = { userAchievement: { id: number; achievementId: number; unlockedAt: Date }; achievement: { id: number; name: string; icon: string; rarity: string } | null };
  const recentAchievements = (userAchievements as UA[] ?? []).slice(0, 6);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="font-display text-3xl font-bold mb-8">
          MY <span className="text-primary">PROFILE</span>
        </h1>

        {isLoading ? (
          <div className="bg-card border border-border rounded-xl p-8 animate-pulse">
            <div className="flex gap-6">
              <div className="w-24 h-24 rounded-full bg-secondary" />
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-secondary rounded w-1/3" />
                <div className="h-4 bg-secondary rounded w-1/4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative group">
                  {editingAvatar ? (
                    <div className="w-24 h-24 rounded-full bg-secondary border-4 border-primary/30 flex items-center justify-center">
                      <div className="text-xs text-center text-muted-foreground">Edit mode</div>
                    </div>
                  ) : profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name ?? 'User'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center text-primary font-display font-black text-2xl">
                      {getInitials(profile?.name)}
                    </div>
                  )}
                  <button
                    onClick={startAvatarEdit}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-background hover:bg-primary/80 transition-colors"
                    title="Edit avatar"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <div className="absolute -bottom-1 -right-8 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-background pointer-events-none">
                    {profile?.level ?? 1}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  {editing ? (
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="bg-secondary border-border max-w-xs"
                        placeholder="Your name"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <Button size="sm" onClick={saveEdit} disabled={updateProfile.isPending} className="bg-primary text-primary-foreground">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-display font-bold text-2xl">{profile?.name ?? 'Anonymous'}</h2>
                      <button onClick={startEdit} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm mb-1">{profile?.email ?? ''}</p>
                  {(profile?.userId || profile?.country) && (
                    <div className="space-y-2 mb-4 p-3 bg-secondary/40 rounded-lg border border-border/50">
                      {profile?.userId && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60 font-semibold">OptimEarn-ID:</span>
                          <code className="text-xs font-mono font-bold text-primary bg-background/50 px-2 py-1 rounded cursor-copy hover:bg-background transition-colors" 
                            title="Click to copy" 
                            onClick={() => { navigator.clipboard.writeText(profile.userId!); toast.success('ID copied!'); }}>
                            {profile.userId}
                          </code>
                        </div>
                      )}
                      {profile.country && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{getCountryFlag(profile.country)} {getCountryName(profile.country)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
                      <Star className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{(profile?.points ?? 0).toLocaleString()} pts</span>
                    </div>
                    {(profile?.streak ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-bold text-orange-400">{profile?.streak}d streak</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-3 py-1.5">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-sm font-medium">Rank #{stats?.rank ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Level {profile?.level ?? 1} Progress</span>
                  <span className="text-sm text-muted-foreground">{profile?.xp ?? 0} / {profile?.xpToNextLevel ?? 500} XP</span>
                </div>
                <Progress value={xpPercent} className="h-3 bg-secondary" />
                <p className="text-xs text-muted-foreground mt-1.5">{profile?.xpToNextLevel ?? 500 - (profile?.xp ?? 0)} XP until Level {(profile?.level ?? 1) + 1}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Earned', value: (profile?.totalEarned ?? 0).toLocaleString(), unit: 'pts', icon: <Zap className="w-5 h-5 text-primary" />, color: 'bg-primary/15' },
                { label: 'Tasks Done', value: String(stats?.completedTasks ?? 0), unit: 'tasks', icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, color: 'bg-green-400/15' },
                { label: 'Achievements', value: String(recentAchievements.length), unit: 'unlocked', icon: <Award className="w-5 h-5 text-yellow-400" />, color: 'bg-yellow-400/15' },
                { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '—', unit: '', icon: <User className="w-5 h-5 text-blue-400" />, color: 'bg-blue-400/15' },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.color)}>
                    {stat.icon}
                  </div>
                  <p className="font-display font-bold text-xl">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Achievements */}
            {recentAchievements.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  Recent Achievements
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {recentAchievements.map((ua) => (
                    <div key={ua.userAchievement.id} className="flex flex-col items-center gap-2 p-3 bg-secondary/50 rounded-xl">
                      <span className="text-2xl">{ua.achievement?.icon ?? '🏆'}</span>
                      <p className="text-xs text-center text-muted-foreground line-clamp-2">{ua.achievement?.name ?? 'Achievement'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login History */}
            {loginHistory && loginHistory.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Recent Login Locations
                </h3>
                <div className="space-y-2">
                  {loginHistory.map((login: any) => (
                    <div key={login.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
                      <div>
                        <div className="text-white text-sm font-medium">{getCountryFlag(login.country)} {login.country || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs font-mono">{login.ipAddress}</div>
                        <div className="text-gray-500 text-xs">{new Date(login.loginAt).toLocaleString()}</div>
                      </div>
                      {profile?.originalCountry && profile.originalCountry !== login.country && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                          <span>Different</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avatar URL Edit Modal */}
        {editingAvatar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Edit Profile Picture</h3>
              <p className="text-sm text-muted-foreground mb-4">Enter the URL of your profile picture image</p>
              <Input
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                className="bg-secondary border-border mb-4"
                placeholder="https://example.com/avatar.jpg"
                onKeyDown={(e) => e.key === 'Enter' && saveAvatarEdit()}
              />
              {avatarInput && (
                <div className="mb-4 p-3 bg-secondary rounded-lg flex items-center gap-3">
                  <img
                    src={avatarInput}
                    alt="Preview"
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingAvatar(false)}>Cancel</Button>
                <Button onClick={saveAvatarEdit} disabled={updateProfile.isPending} className="bg-primary text-primary-foreground">
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
