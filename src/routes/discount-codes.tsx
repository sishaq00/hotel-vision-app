// Discount codes management — create/edit/delete percentage discount codes.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Percent, Copy } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/system/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { toast } from "sonner";
import {
  type DiscountCode,
  loadDiscountCodes,
  saveDiscountCodes,
  isCodeValidToday,
} from "@/lib/discount-codes";

export const Route = createFileRoute("/discount-codes")({
  head: () => ({
    meta: [
      { title: "Discount Codes — NEXORA OS" },
      { name: "description", content: "Promotional percentage discount codes for reservations." },
    ],
  }),
  component: DiscountCodesPage,
});

const QUICK_PERCENTS = [5, 10, 15, 20, 25, 30, 50, 100];

function DiscountCodesPage() {
  const confirm = useConfirm();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    label: "",
    percent: 10,
    validFrom: "",
    validTo: "",
    maxUses: "",
    active: true,
  });

  useEffect(() => {
    setCodes(loadDiscountCodes());
  }, []);

  const refresh = () => setCodes(loadDiscountCodes());

  const handleAdd = () => {
    const codeNorm = form.code.trim().toUpperCase();
    if (!codeNorm) {
      toast.error("Code is required");
      return;
    }
    if (codes.some((c) => c.code.toUpperCase() === codeNorm)) {
      toast.error("That code already exists");
      return;
    }
    if (form.percent < 1 || form.percent > 100) {
      toast.error("Percent must be between 1 and 100");
      return;
    }
    const next: DiscountCode = {
      id: crypto.randomUUID(),
      code: codeNorm,
      label: form.label.trim() || `${form.percent}% off`,
      percent: Number(form.percent),
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      usedCount: 0,
      active: form.active,
      createdAt: new Date().toISOString(),
    };
    const updated = [...codes, next];
    saveDiscountCodes(updated);
    setCodes(updated);
    setOpen(false);
    setForm({ code: "", label: "", percent: 10, validFrom: "", validTo: "", maxUses: "", active: true });
    toast.success(`Discount code "${next.code}" created`);
  };

  const handleDelete = async (c: DiscountCode) => {
    const ok = await confirm({
      title: "Delete discount code?",
      description: `Remove "${c.code}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const updated = codes.filter((x) => x.id !== c.id);
    saveDiscountCodes(updated);
    setCodes(updated);
    toast.success("Discount code deleted");
  };

  const toggleActive = (c: DiscountCode) => {
    const updated = codes.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x));
    saveDiscountCodes(updated);
    setCodes(updated);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success(`Copied ${code}`));
  };

  const sorted = [...codes].sort((a, b) => a.percent - b.percent);
  const activeCount = codes.filter(isCodeValidToday).length;

  return (
    <AppLayout
      title="Discount Codes"
      subtitle="Promotional percentage codes that staff can apply when creating a reservation"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">
            {codes.length} code{codes.length === 1 ? "" : "s"} · {activeCount} active today
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>New discount code</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-code">Code</Label>
                    <Input
                      id="dc-code"
                      placeholder="WELCOME10"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-pct">Percent (%)</Label>
                    <Input
                      id="dc-pct"
                      type="number"
                      min={1}
                      max={100}
                      value={form.percent}
                      onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PERCENTS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={form.percent === p ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setForm({ ...form, percent: p })}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dc-label">Label (optional)</Label>
                  <Input
                    id="dc-label"
                    placeholder="Welcome offer"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
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
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-max">Max uses (optional)</Label>
                    <Input
                      id="dc-max"
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={form.maxUses}
                      onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(v) => setForm({ ...form, active: v })}
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Create code</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="No discount codes yet"
            description="Create promotional codes (10%, 15%, 20%, up to 100%) that staff can apply when booking a guest."
            actionLabel="Add first code"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Percent</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const valid = isCodeValidToday(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="inline-flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
                        title="Click to copy"
                      >
                        {c.code}
                        <Copy className="h-3 w-3 opacity-60" />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{c.label}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        {c.percent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.validFrom || c.validTo
                        ? `${c.validFrom ?? "…"} → ${c.validTo ?? "…"}`
                        : "Always"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(c)} className="inline-flex">
                        {valid ? (
                          <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
                        ) : (
                          <Badge variant="outline">{c.active ? "Expired" : "Disabled"}</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
