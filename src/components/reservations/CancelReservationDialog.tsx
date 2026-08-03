// Cancel / No-Show dialog — reason is mandatory, optional fee, DB-first.
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cancelReservationRpc, markNoShowRpc } from "@/lib/reservations-rpc";
import type { Reservation } from "@/store/hotel-store";

const REASONS = [
  "Guest request",
  "Duplicate booking",
  "Payment not received",
  "Overbooking",
  "Hotel operational issue",
  "Other",
];

interface Props {
  reservation: Reservation | null;
  mode?: "cancel" | "no-show";
  onClose: () => void;
  onDone?: () => void;
}

export function CancelReservationDialog({ reservation, mode = "cancel", onClose, onDone }: Props) {
  const isNoShow = mode === "no-show";
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState("");
  const [fee, setFee] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason(""); setPreset(""); setFee("0");
  }, [reservation?.id, mode]);

  if (!reservation) return null;

  const finalReason = (preset && preset !== "Other" ? preset : reason).trim();

  const submit = async () => {
    if (!isNoShow && !finalReason) {
      toast.error("A cancellation reason is required");
      return;
    }
    setBusy(true);
    const amount = Number(fee) || 0;
    const res = isNoShow
      ? await markNoShowRpc(reservation.id, finalReason || undefined, amount)
      : await cancelReservationRpc(reservation.id, finalReason, amount);
    setBusy(false);
    if (!res.ok) {
      toast.error(isNoShow ? "No-show failed" : "Cancel failed", { description: res.error });
      return;
    }
    toast.success(isNoShow ? "Marked as no show" : "Reservation cancelled");
    onDone?.();
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isNoShow ? "Mark as No Show" : "Cancel reservation"}</DialogTitle>
          <DialogDescription>
            {reservation.confirmationNumber ?? reservation.id} · {reservation.checkIn} → {reservation.checkOut}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason {isNoShow ? "(optional)" : <span className="text-destructive">*</span>}</Label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={preset === r ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setPreset(preset === r ? "" : r)}
                >
                  {r}
                </Button>
              ))}
            </div>
            {(preset === "Other" || !preset) && (
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason..."
                rows={3}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-fee">{isNoShow ? "No-show fee" : "Cancellation fee"}</Label>
            <Input
              id="cancel-fee"
              type="number"
              min={0}
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Keep reservation</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? "Saving..." : isNoShow ? "Mark no show" : "Cancel reservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
