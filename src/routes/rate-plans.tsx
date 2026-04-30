// Seasonal rate plans — pure-frontend, persisted in localStorage.
// Each plan: name, room type code, price/night, valid from/to.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/system/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useHotelStore } from "@/store/hotel-store";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/rate-plans")({
  head: () => ({
    meta: [
      { title: "Rate Plans — NEXORA OS" },
      { name: "description", content: "Seasonal pricing per room type." },
    ],
  }),
  component: RatePlansPage,
});

interface RatePlan {
  id: string;
  name: string;
  roomTypeCode: string;
  pricePerNight: number;
  validFrom: string;
  validTo: string;
  createdAt: string;
}

const STORAGE_KEY = "nexora.rate-plans.v1";

function loadPlans(): RatePlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RatePlan[]) : [];
  } catch {
    return [];
  }
}

function savePlans(plans: RatePlan[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function isActive(plan: RatePlan): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return plan.validFrom <= today && plan.validTo >= today;
}

function RatePlansPage() {
  const rooms = useHotelStore((s) => s.rooms);
  const roomTypes = useMemo(
    () => Array.from(new Set(rooms.filter((r) => !r.archived).map((r) => r.type))),
    [rooms],
  );
  const settings = useHotelStore((s) => s.settings);
  const confirm = useConfirm();

  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    roomTypeCode: "",
    pricePerNight: 100,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  });

  useEffect(() => {
    setPlans(loadPlans());
  }, []);

  const handleAdd = () => {
    if (!form.name.trim() || !form.roomTypeCode) {
      toast.error("Name and room type required");
      return;
    }
    if (form.validFrom > form.validTo) {
      toast.error("'From' date must be before 'To'");
      return;
    }
    const next: RatePlan = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      roomTypeCode: form.roomTypeCode,
      pricePerNight: Number(form.pricePerNight) || 0,
      validFrom: form.validFrom,
      validTo: form.validTo,
      createdAt: new Date().toISOString(),
    };
    const updated = [...plans, next];
    setPlans(updated);
    savePlans(updated);
    setOpen(false);
    setForm({ ...form, name: "" });
    toast.success(`Rate plan "${next.name}" added`);
  };

  const handleDelete = async (plan: RatePlan) => {
    const ok = await confirm({
      title: "Delete rate plan?",
      description: `Remove "${plan.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const updated = plans.filter((p) => p.id !== plan.id);
    setPlans(updated);
    savePlans(updated);
    toast.success("Rate plan deleted");
  };

  const sorted = [...plans].sort((a, b) => (a.validFrom < b.validFrom ? -1 : 1));

  return (
    <AppLayout
      title="Rate Plans"
      subtitle="Seasonal pricing for room types — high season, low season, holiday packages"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">
            {plans.length} plan{plans.length === 1 ? "" : "s"} ·{" "}
            {plans.filter(isActive).length} active today
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>New rate plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rp-name">Plan name</Label>
                  <Input
                    id="rp-name"
                    placeholder="High Season 2026"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Room type</Label>
                  <Select
                    value={form.roomTypeCode}
                    onValueChange={(v) => setForm({ ...form, roomTypeCode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.length === 0 ? (
                        <SelectItem value="ALL">All types</SelectItem>
                      ) : (
                        roomTypes.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {rt}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-price">Price per night ({settings.currency})</Label>
                  <Input
                    id="rp-price"
                    type="number"
                    min={0}
                    value={form.pricePerNight}
                    onChange={(e) => setForm({ ...form, pricePerNight: Number(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valid from</Label>
                    <Input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valid to</Label>
                    <Input
                      type="date"
                      value={form.validTo}
                      onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Add plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No rate plans yet"
            description="Create seasonal price overrides — high season, weekends, holidays. The base room price still applies when no plan covers the dates."
            actionLabel="Add first plan"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Room type</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead className="text-right">Price/night</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.roomTypeCode}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.validFrom} → {p.validTo}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {settings.currency} {p.pricePerNight.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {isActive(p) ? (
                      <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(p)}
                      title="Delete plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
