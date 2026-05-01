// New reservation dialog with Zod validation + overlap detection + i18n.
import { useState } from "react";
import { Plus } from "lucide-react";
import { useHotelStore } from "@/store/hotel-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { guestSchema, reservationSchema, parseOrToast } from "@/lib/validation";
import { computeStayPrice } from "@/lib/rate-plans";
import { Tag, Percent, X, Check } from "lucide-react";
import {
  type DiscountCode,
  findValidCode,
  applyDiscount,
  consumeCode,
  loadDiscountCodes,
  isCodeValidToday,
} from "@/lib/discount-codes";

interface NewReservationDialogProps {
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewReservationDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: NewReservationDialogProps) {
  const [openInner, setOpenInner] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInner;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChangeProp?.(v);
    else setOpenInner(v);
  };
  const { t } = useT();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [existingGuestId, setExistingGuestId] = useState<string>("__new__");
  const [roomId, setRoomId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );

  // Discount code state
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<DiscountCode | null>(null);

  const tryApplyCode = (raw: string) => {
    const found = findValidCode(raw);
    if (!found) {
      toast.error("Invalid or expired code");
      return;
    }
    setAppliedCode(found);
    setCodeInput(found.code);
    toast.success(`${found.percent}% discount applied`);
  };

  const removeCode = () => {
    setAppliedCode(null);
    setCodeInput("");
  };

  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);
  const addGuest = useHotelStore((s) => s.addGuest);
  const addReservation = useHotelStore((s) => s.addReservation);
  const hasRoomConflict = useHotelStore((s) => s.hasRoomConflict);

  const bookableRooms = rooms.filter((r) => r.status !== "maintenance");

  const datesValid =
    !!checkIn &&
    !!checkOut &&
    new Date(checkOut).getTime() > new Date(checkIn).getTime();

  const conflict =
    roomId && datesValid ? hasRoomConflict(roomId, checkIn, checkOut) : null;

  const conflictGuestName = conflict
    ? guests.find((g) => g.id === conflict.guestId)?.name ?? "another guest"
    : null;

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setCountry("");
    setExistingGuestId("__new__"); setRoomId(""); setNotes("");
    setCheckIn(new Date().toISOString().slice(0, 10));
    setCheckOut(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let guestId = existingGuestId;
    if (existingGuestId === "__new__") {
      const parsed = parseOrToast(guestSchema, { name, email, phone, country });
      if (!parsed) return;
      guestId = addGuest({
        name: parsed.name,
        email: parsed.email ?? "",
        phone: parsed.phone ?? "",
        country: parsed.country ?? "",
      });
    }

    const resValid = parseOrToast(reservationSchema, {
      guestId, roomId, checkIn, checkOut,
    });
    if (!resValid) return;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const { total, nights } = computeStayPrice(room.price, room.type, checkIn, checkOut);

    const result = addReservation({
      guestId,
      roomId,
      checkIn,
      checkOut,
      status: "confirmed",
      totalAmount: total,
      notes: notes.trim() || undefined,
    });

    if (!result.ok) {
      toast.error(t("res.cannot-create"), { description: result.error });
      return;
    }

    toast.success(t("res.created"), {
      description: `${nights} ${nights > 1 ? t("co.nights-plural") : t("co.nights")} · ${t("co.room")} ${room.number}`,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              {t("res.new")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("res.new")}</DialogTitle>
          <DialogDescription>{t("res.new-desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("res.guest")}</Label>
            <Select value={existingGuestId} onValueChange={setExistingGuestId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">{t("res.add-new-guest")}</SelectItem>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {existingGuestId === "__new__" && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs">{t("res.full-name")} *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">{t("res.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">{t("res.phone")}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 ..." maxLength={40} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="country" className="text-xs">{t("res.country")}</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" maxLength={80} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("res.room")}</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder={bookableRooms.length === 0 ? t("res.no-rooms") : t("res.select-room")} />
              </SelectTrigger>
              <SelectContent>
                {bookableRooms.map((r) => {
                  const conflictForRoom = datesValid && hasRoomConflict(r.id, checkIn, checkOut);
                  return (
                    <SelectItem key={r.id} value={r.id}>
                      {t("co.room")} {r.number} · {r.type} · ${r.price}/{t("co.nights")}
                      {conflictForRoom ? " · ⚠" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkin">{t("res.checkin")}</Label>
              <Input id="checkin" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout">{t("res.checkout")}</Label>
              <Input id="checkout" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-notes">Notes / Special requests</Label>
            <textarea
              id="res-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra bed, late check-in, allergy info…"
              rows={2}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {!datesValid && checkIn && checkOut && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("res.dates-invalid")}
            </div>
          )}

          {conflict && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">{t("res.room-unavailable")}</p>
              <p className="mt-1 text-xs opacity-90">
                {conflictGuestName} · {conflict.checkIn} → {conflict.checkOut}
              </p>
            </div>
          )}

          {(() => {
            if (!roomId || !datesValid) return null;
            const room = rooms.find((r) => r.id === roomId);
            if (!room) return null;
            const { total, nights, appliedPlan } = computeStayPrice(
              room.price, room.type, checkIn, checkOut,
            );
            const baseTotal = room.price * nights;
            return (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {nights} × {t("co.room")} {room.number}
                  </span>
                  <span className="font-semibold">${total.toLocaleString()}</span>
                </div>
                {appliedPlan && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                    <Tag className="h-3 w-3" />
                    <span>{appliedPlan.name}</span>
                    {total !== baseTotal && (
                      <span className="text-muted-foreground">
                        (base ${baseTotal.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!datesValid || !roomId || !!conflict}>
              {t("res.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
