import { useMemo, useState } from "react";
import { Award, Plus, Minus, Gift, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getGuestBalance, getGuestHistory, getTierForPoints, getNextTier,
  loadLoyaltySettings, adjustPoints, redeemPoints, pointsToCash,
  type LoyaltyTxn,
} from "@/lib/loyalty";
import { useHotelStore } from "@/store/hotel-store";

export function LoyaltyTab({ guestId, guestName }: { guestId: string; guestName: string }) {
  const settings = useHotelStore((s) => s.settings);
  const [refresh, setRefresh] = useState(0);
  const [adjustOpen, setAdjustOpen] = useState<"add" | "remove" | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [pts, setPts] = useState("");
  const [reason, setReason] = useState("");

  const loyalty = useMemo(() => loadLoyaltySettings(), [refresh]);
  const balance = useMemo(() => getGuestBalance(guestId), [guestId, refresh]);
  const history = useMemo(() => getGuestHistory(guestId), [guestId, refresh]);
  const tier = useMemo(() => getTierForPoints(balance, loyalty), [balance, loyalty]);
  const nextTier = useMemo(() => getNextTier(balance, loyalty), [balance, loyalty]);

  const progress = nextTier
    ? Math.min(100, Math.round(((balance - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100))
    : 100;

  function bump() { setRefresh((n) => n + 1); }

  function handleAdjust() {
    const n = Number(pts);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a positive number"); return; }
    const signed = adjustOpen === "add" ? n : -n;
    adjustPoints(guestId, signed, reason || (adjustOpen === "add" ? "Manual credit" : "Manual debit"));
    toast.success(`${adjustOpen === "add" ? "Added" : "Removed"} ${n} points`);
    setAdjustOpen(null); setPts(""); setReason(""); bump();
  }

  function handleRedeem() {
    const n = Number(pts);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a positive number"); return; }
    const r = redeemPoints(guestId, n, reason || "Redemption");
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Redeemed ${n} pts → ${settings.currency}${r.cashValue.toFixed(2)}`);
    setRedeemOpen(false); setPts(""); setReason(""); bump();
  }

  if (!loyalty.enabled) {
    return (
      <Card className="border-border/60 shadow-card p-8 text-center text-sm text-muted-foreground">
        Loyalty program is disabled. Enable it in Loyalty settings.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-border/60 shadow-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Award className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Loyalty balance · {guestName}</p>
              <p className="text-2xl font-bold tabular-nums">{balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
              <p className="text-xs text-muted-foreground">≈ {settings.currency} {pointsToCash(balance, loyalty).toFixed(2)} redeemable</p>
            </div>
          </div>
          <Badge variant="outline" className={`gap-1 ${tier.color}`}>
            <Award className="h-3 w-3" /> {tier.name}
          </Badge>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{tier.name}</span>
              <span>{nextTier.minPoints - balance} pts to {nextTier.name}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setAdjustOpen("add"); setPts(""); setReason(""); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add points
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setAdjustOpen("remove"); setPts(""); setReason(""); }}>
            <Minus className="mr-1 h-3.5 w-3.5" /> Remove
          </Button>
          <Button size="sm" onClick={() => { setRedeemOpen(true); setPts(""); setReason(""); }} disabled={balance <= 0}>
            <Gift className="mr-1 h-3.5 w-3.5" /> Redeem
          </Button>
        </div>
      </Card>

      {/* History */}
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
          <History className="h-4 w-4 text-primary" /> History · {history.length}
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No loyalty activity yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((t: LoyaltyTxn) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{new Date(t.at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{t.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.reason}</TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${t.points >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.points >= 0 ? "+" : ""}{t.points.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Adjust dialog */}
      <Dialog open={adjustOpen !== null} onOpenChange={(o) => !o && setAdjustOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustOpen === "add" ? "Add points" : "Remove points"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Points</label>
              <Input type="number" min="1" value={pts} onChange={(e) => setPts(e.target.value)} placeholder="100" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Service compensation" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(null)}>Cancel</Button>
            <Button onClick={handleAdjust}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem points</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              Rate: <strong>{loyalty.redemptionRate} pts</strong> = {settings.currency} 1.00
              <br />Available: <strong>{balance.toLocaleString()} pts</strong> (≈ {settings.currency} {pointsToCash(balance, loyalty).toFixed(2)})
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Points to redeem</label>
              <Input type="number" min="1" max={balance} value={pts} onChange={(e) => setPts(e.target.value)} placeholder="100" />
              {pts && Number(pts) > 0 && (
                <p className="mt-1 text-xs text-emerald-700">
                  = {settings.currency} {pointsToCash(Number(pts), loyalty).toFixed(2)} cash value
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reason / reference</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Invoice INV-2025-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>Cancel</Button>
            <Button onClick={handleRedeem}>Redeem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
