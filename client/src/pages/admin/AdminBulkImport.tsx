import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2, X, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { COUNTRIES } from "@shared/countries";

const DEVICES = ["iOS", "Android", "PC"] as const;
type DeviceType = typeof DEVICES[number];

interface BulkOfferRow {
  name: string;
  link: string;
  thumbnailUrl: string;
  countries: string[];
  devices: DeviceType[];
  points: string;
}

// Multi-select country picker component
function CountryMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter(c => c !== code));
    else onChange([...value, code]);
  };
  return (
    <div className="relative">
      <div
        className="min-h-9 w-full px-3 py-1 border border-border rounded-lg bg-background text-foreground text-sm cursor-pointer flex flex-wrap gap-1 items-center"
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0 && <span className="text-muted-foreground">All countries</span>}
        {value.map(code => (
          <Badge key={code} variant="secondary" className="text-xs py-0 px-1 gap-1">
            {code}
            <button onClick={(e) => { e.stopPropagation(); toggle(code); }} className="hover:text-destructive">
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search countries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 text-xs"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-muted-foreground"
              onClick={() => { onChange([]); setOpen(false); }}
            >
              Clear (All countries)
            </button>
            {filtered.map(c => (
              <button
                key={c.code}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 ${value.includes(c.code) ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => toggle(c.code)}
              >
                <span className="font-mono text-muted-foreground w-6">{c.code}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Multi-select device picker
function DeviceMultiSelect({ value, onChange }: { value: DeviceType[]; onChange: (v: DeviceType[]) => void }) {
  const toggle = (d: DeviceType) => {
    if (value.includes(d)) onChange(value.filter(x => x !== d));
    else onChange([...value, d]);
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {DEVICES.map(d => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${value.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

export default function AdminBulkImport() {
  const [activeTab, setActiveTab] = useState<"csv" | "form">("form");
  const [csvText, setCsvText] = useState("");
  const [formRows, setFormRows] = useState<BulkOfferRow[]>([
    { name: "", link: "", thumbnailUrl: "", countries: [], devices: [], points: "" }
  ]);
  const [isImporting, setIsImporting] = useState(false);

  const bulkImportMutation = trpc.admin.tasks.bulkImportOffers.useMutation();

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const rows: Array<{ name: string; link?: string; thumbnailUrl?: string; countries?: string[]; devices?: DeviceType[]; points?: number }> = [];
    const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map(s => s.trim());
      const [name, link, thumbnailUrl, countriesRaw, devicesRaw, pointsRaw] = parts;
      if (name) {
        rows.push({
          name,
          link: link || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          countries: countriesRaw ? countriesRaw.split("|").map(c => c.trim()).filter(Boolean) : undefined,
          devices: devicesRaw ? (devicesRaw.split("|").map(d => d.trim()).filter(d => DEVICES.includes(d as DeviceType)) as DeviceType[]) : undefined,
          points: pointsRaw ? parseInt(pointsRaw) : undefined,
        });
      }
    }
    return rows;
  };

  const handleCSVImport = async () => {
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
      setIsImporting(true);
      const result = await bulkImportMutation.mutateAsync({ offers: rows });
      toast.success(`Successfully imported ${result.created} offers`);
      setCsvText("");
    } catch (error) {
      toast.error("Failed to import offers");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFormImport = async () => {
    try {
      const validRows = formRows.filter(r => r.name.trim());
      if (validRows.length === 0) { toast.error("Please fill in at least the name for one offer"); return; }
      setIsImporting(true);
      const offers = validRows.map(r => ({
        name: r.name,
        link: r.link || undefined,
        thumbnailUrl: r.thumbnailUrl || undefined,
        countries: r.countries.length > 0 ? r.countries : undefined,
        devices: r.devices.length > 0 ? r.devices : undefined,
        points: r.points ? parseInt(r.points) : undefined,
      }));
      const result = await bulkImportMutation.mutateAsync({ offers });
      toast.success(`Successfully imported ${result.created} offers`);
      setFormRows([{ name: "", link: "", thumbnailUrl: "", countries: [], devices: [], points: "" }]);
    } catch (error) {
      toast.error("Failed to import offers");
    } finally {
      setIsImporting(false);
    }
  };

  const addFormRow = () => setFormRows([...formRows, { name: "", link: "", thumbnailUrl: "", countries: [], devices: [], points: "" }]);
  const removeFormRow = (index: number) => setFormRows(formRows.filter((_, i) => i !== index));
  const updateFormRow = (index: number, field: keyof BulkOfferRow, value: any) => {
    const updated = [...formRows];
    (updated[index] as any)[field] = value;
    setFormRows(updated);
  };

  const downloadTemplate = () => {
    const csv = "name,link,thumbnailUrl,countries (pipe-separated codes),devices (iOS|Android|PC),points\nSurvey App,https://example.com,https://example.com/thumb.png,US|CA|GB,iOS|Android,50\nVideo Offer,https://example2.com,https://example2.com/thumb.png,DE|FR,PC,100";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bulk_import_template.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Import Offers</h1>
          <p className="text-muted-foreground mt-1">Import multiple offers at once with country and device targeting</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          CSV Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "csv" | "form")}>
        <TabsList>
          <TabsTrigger value="form">Form Input</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
        </TabsList>

        {/* Form Input Tab */}
        <TabsContent value="form" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              {formRows.map((row, index) => (
                <div key={index} className="space-y-3 pb-4 border-b border-border last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Offer #{index + 1}</span>
                    {formRows.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeFormRow(index)} className="text-destructive hover:text-destructive h-7 w-7 p-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Offer Name *</Label>
                      <Input placeholder="Survey App" value={row.name} onChange={(e) => updateFormRow(index, "name", e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Link (optional)</Label>
                      <Input placeholder="https://example.com" value={row.link} onChange={(e) => updateFormRow(index, "link", e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Thumbnail URL (optional)</Label>
                      <Input placeholder="https://example.com/thumb.png" value={row.thumbnailUrl} onChange={(e) => updateFormRow(index, "thumbnailUrl", e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Points (optional)</Label>
                      <Input type="number" placeholder="10" value={row.points} onChange={(e) => updateFormRow(index, "points", e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Target Countries (empty = all)</Label>
                      <CountryMultiSelect value={row.countries} onChange={(v) => updateFormRow(index, "countries", v)} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Target Devices (empty = all)</Label>
                      <DeviceMultiSelect value={row.devices} onChange={(v) => updateFormRow(index, "devices", v)} />
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addFormRow} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Offer
              </Button>

              <Button onClick={handleFormImport} disabled={isImporting} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "Importing..." : `Import ${formRows.filter(r => r.name.trim()).length} Offer(s)`}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* CSV Import Tab */}
        <TabsContent value="csv" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-input">CSV Format: name, link, countries (pipe-separated), devices (pipe-separated), points</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Example: <code className="bg-muted px-1 rounded">Survey App,https://example.com,US|CA|GB,iOS|Android,50</code>
                </p>
                <textarea
                  id="csv-input"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={"name,link,countries,devices,points\nSurvey App,https://example.com,US|CA,iOS|Android,50\nVideo Offer,https://example2.com,DE|FR,PC,100"}
                  className="w-full h-48 p-3 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
                />
              </div>
              <Button onClick={handleCSVImport} disabled={!csvText.trim() || isImporting} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "Importing..." : "Import from CSV"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 bg-secondary/30">
        <h3 className="font-semibold mb-3">How It Works</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Only <strong>Offer Name</strong> is required. All other fields are optional and can be edited later in the normal offer editor.</p>
          <p>Leave <strong>Countries</strong> empty to show the offer to all users worldwide. Select specific countries to target only those users.</p>
          <p>Leave <strong>Devices</strong> empty to show on all device types. Select specific devices to target iOS, Android, or PC users.</p>
          <p>Supports <strong>{COUNTRIES.length} countries</strong> with ISO 3166-1 alpha-2 codes.</p>
        </div>
      </Card>
    </div>
  );
}
