import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Save, Upload, Download, Trash2, RotateCcw, Image as ImageIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  downloadBackup,
  restoreFromFile,
  listAutoBackups,
  restoreAutoBackup,
} from "@/lib/backup";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NEXORA OS" },
      { name: "description", content: "Configure your hotel preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useHotelStore((s) => s.settings);
  const update = useHotelStore((s) => s.updateSettings);
  const { t } = useT();

  const [form, setForm] = useState(settings);
  const [autoList, setAutoList] = useState(listAutoBackups());
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    update(form);
    toast.success(t("toast.saved"));
  };

  const onLogo = (file: File) => {
    if (file.size > 512 * 1024) {
      toast.error("Logo must be under 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, logoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const onRestoreFile = async (file: File) => {
    const ok = await restoreFromFile(file);
    if (!ok) return toast.error(t("backup.invalid"));
    toast.success(t("backup.restored"));
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <AppLayout title={t("settings.title")} subtitle={t("sub.settings")}>
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {/* Hotel info */}
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.hotel")}</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="hotelName">Hotel name</Label>
              <Input id="hotelName" value={form.hotelName}
                onChange={(e) => setForm({ ...form, hotelName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hotelCode">Hotel code</Label>
              <Input id="hotelCode" value={form.hotelCode}
                onChange={(e) => setForm({ ...form, hotelCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxId">Tax ID / VAT #</Label>
              <Input id="taxId" value={form.taxId ?? ""}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact phone</Label>
              <Input id="phone" value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            {/* Logo */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Logo (PNG/JPG, ≤ 512 KB)</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                  {form.logoDataUrl ? (
                    <img src={form.logoDataUrl} alt="logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/png,image/jpeg" hidden
                  onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm"
                  onClick={() => logoRef.current?.click()}>
                  <Upload className="me-1 h-4 w-4" /> Upload
                </Button>
                {form.logoDataUrl && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => setForm({ ...form, logoDataUrl: undefined })}>
                    <Trash2 className="me-1 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Localization */}
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.localization")}</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={form.language}
                onValueChange={(v) => setForm({ ...form, language: v as "en" | "ar" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* Billing */}
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.billing")}</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vat">VAT rate (%)</Label>
              <Input id="vat" type="number" step="0.1" min={0} max={100}
                value={(form.taxRate * 100).toFixed(2)}
                onChange={(e) => setForm({ ...form, taxRate: Math.max(0, Number(e.target.value) / 100) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc">Service fee (%)</Label>
              <Input id="svc" type="number" step="0.1" min={0} max={100}
                value={(form.serviceFeeRate * 100).toFixed(2)}
                onChange={(e) => setForm({ ...form, serviceFeeRate: Math.max(0, Number(e.target.value) / 100) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Invoice prefix</Label>
              <Input id="prefix" value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="counter">Next invoice #</Label>
              <Input id="counter" type="number" value={form.invoiceCounter + 1}
                onChange={(e) => setForm({ ...form, invoiceCounter: Math.max(0, Number(e.target.value) - 1) })} />
            </div>
          </div>
        </Card>

        {/* Invoice template */}
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">{t("settings.invoice")}</h3>
          <p className="text-xs text-muted-foreground">Notes and footer text printed on every invoice PDF.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Invoice notes / payment terms</Label>
              <Textarea id="notes" rows={2} value={form.invoiceNotes ?? ""}
                onChange={(e) => setForm({ ...form, invoiceNotes: e.target.value })}
                placeholder="e.g. Payment due upon receipt." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="footer">Invoice footer</Label>
              <Input id="footer" value={form.invoiceFooter ?? ""}
                onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
                placeholder="Thank you for staying with us." />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2 shadow-md">
            <Save className="h-4 w-4" /> {t("common.save")}
          </Button>
        </div>
      </form>

      {/* Backup & Restore */}
      <Card className="mt-6 max-w-3xl border-border/60 p-6 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">{t("settings.backup")}</h3>
        <p className="text-xs text-muted-foreground">
          Everything is stored locally. Export a JSON file regularly to be safe.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm"
            onClick={() => { downloadBackup(); toast.success(t("backup.exported")); }}>
            <Download className="me-1 h-4 w-4" /> {t("backup.export")}
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={(e) => e.target.files?.[0] && onRestoreFile(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm"
            onClick={() => fileRef.current?.click()}>
            <Upload className="me-1 h-4 w-4" /> {t("backup.import")}
          </Button>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-foreground">{t("backup.auto")}</p>
          {autoList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No automatic backups yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Saved at</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoList.map((b) => (
                  <TableRow key={b.key}>
                    <TableCell className="font-mono text-xs">{b.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(b.savedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => {
                          if (restoreAutoBackup(b.key)) {
                            toast.success(t("backup.restored"));
                            setTimeout(() => window.location.reload(), 800);
                          }
                        }}>
                        <RotateCcw className="me-1 h-3.5 w-3.5" /> {t("backup.restore")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Button type="button" variant="ghost" size="sm" className="mt-2"
            onClick={() => setAutoList(listAutoBackups())}>
            Refresh list
          </Button>
        </div>
      </Card>
    </AppLayout>
  );
}
