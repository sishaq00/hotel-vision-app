// Loyalty program settings (staff-only).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Award, Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  loadLoyaltySettings, saveLoyaltySettings, DEFAULT_LOYALTY_SETTINGS,
  type LoyaltySettings, type LoyaltyTier, type LoyaltyTierName,
} from "@/lib/loyalty";

export const Route = createFileRoute("/loyalty")({
  component: LoyaltyPage,
});

function LoyaltyPage() {
  const [s, setS] = useState<LoyaltySettings>(() => loadLoyaltySettings());

  function patch(p: Partial<LoyaltySettings>) { setS((cur) => ({ ...cur, ...p })); }
  function patchTier(idx: number, p: Partial<LoyaltyTier>) {
    setS((cur) => ({ ...cur, tiers: cur.tiers.map((t, i) => (i === idx ? { ...t, ...p } : t)) }));
  }
  function addTier() {
    setS((cur) => ({
      ...cur,
      tiers: [...cur.tiers, { name: "Custom" as LoyaltyTierName, minPoints: 10000, discountPct: 20, color: "bg-violet-500/15 text-violet-700 border-violet-500/40" }],
    }));
  }
  function removeTier(idx: number) {
    setS((cur) => ({ ...cur, tiers: cur.tiers.filter((_, i) => i !== idx) }));
  }

  function save() {
    const sorted = { ...s, tiers: [...s.tiers].sort((a, b) => a.minPoints - b.minPoints) };
    saveLoyaltySettings(sorted);
    setS(sorted);
    toast.success("Loyalty settings saved");
  }
  function reset() {
    setS(DEFAULT_LOYALTY_SETTINGS);
    saveLoyaltySettings(DEFAULT_LOYALTY_SETTINGS);
    toast.success("Reset to defaults");
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Loyalty Program</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Staff-managed program. Points are awarded automatically on guest check-out and can be adjusted or redeemed manually from the guest profile.
        </p>

        <Card className="border-border/60 shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Enable Loyalty</Label>
              <p className="text-xs text-muted-foreground">When off, points are not awarded or redeemable.</p>
            </div>
            <Switch checked={s.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Points earned per 1 currency unit</Label>
              <Input type="number" min="0" step="0.1" value={s.pointsPerCurrency}
                onChange={(e) => patch({ pointsPerCurrency: Number(e.target.value) || 0 })} />
              <p className="mt-1 text-[11px] text-muted-foreground">e.g. 1 = 1 pt per $1 spent.</p>
            </div>
            <div>
              <Label className="text-xs">Points needed for 1 currency unit redemption</Label>
              <Input type="number" min="1" value={s.redemptionRate}
                onChange={(e) => patch({ redemptionRate: Number(e.target.value) || 1 })} />
              <p className="mt-1 text-[11px] text-muted-foreground">e.g. 100 pts = $1 off.</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 shadow-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Tiers</Label>
              <p className="text-xs text-muted-foreground">Sorted automatically by minimum points.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addTier}><Plus className="mr-1 h-3.5 w-3.5" /> Add tier</Button>
          </div>

          <div className="space-y-2">
            {s.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border/60 p-3">
                <div className="col-span-4">
                  <Label className="text-[11px]">Name</Label>
                  <Input value={t.name} onChange={(e) => patchTier(i, { name: e.target.value as LoyaltyTierName })} />
                </div>
                <div className="col-span-3">
                  <Label className="text-[11px]">Min points</Label>
                  <Input type="number" min="0" value={t.minPoints}
                    onChange={(e) => patchTier(i, { minPoints: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-3">
                  <Label className="text-[11px]">Discount %</Label>
                  <Input type="number" min="0" max="100" value={t.discountPct}
                    onChange={(e) => patchTier(i, { discountPct: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button size="icon" variant="ghost" onClick={() => removeTier(i)} disabled={s.tiers.length <= 1}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
          <Button onClick={save}><Save className="mr-1 h-4 w-4" /> Save</Button>
        </div>
      </div>
    </AppLayout>
  );
}
