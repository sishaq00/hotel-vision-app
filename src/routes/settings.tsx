import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

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

  const [form, setForm] = useState(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    update(form);
    toast.success("Settings saved");
  };

  return (
    <AppLayout title="Settings" subtitle="Hotel preferences and configuration">
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Hotel Information</h3>
          <p className="text-xs text-muted-foreground">
            Basic details shown across the application.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="hotelName">Hotel name</Label>
              <Input
                id="hotelName"
                value={form.hotelName}
                onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Contact email</Label>
              <Input
                id="email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact phone</Label>
              <Input
                id="phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Localization</h3>
          <p className="text-xs text-muted-foreground">Currency and timezone settings.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Billing & Invoicing</h3>
          <p className="text-xs text-muted-foreground">
            Tax and service fee rates applied to every check-out invoice.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vat">VAT rate (%)</Label>
              <Input
                id="vat"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={(form.taxRate * 100).toFixed(2)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    taxRate: Math.max(0, Number(e.target.value) / 100),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc">Service fee (%)</Label>
              <Input
                id="svc"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={(form.serviceFeeRate * 100).toFixed(2)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    serviceFeeRate: Math.max(0, Number(e.target.value) / 100),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Invoice prefix</Label>
              <Input
                id="prefix"
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="counter">Next invoice #</Label>
              <Input
                id="counter"
                type="number"
                value={form.invoiceCounter + 1}
                onChange={(e) =>
                  setForm({ ...form, invoiceCounter: Math.max(0, Number(e.target.value) - 1) })
                }
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2 shadow-md">
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
