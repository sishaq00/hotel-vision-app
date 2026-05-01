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
import { Tag, Percent, X, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    setAppliedCode(null);
    setCodeInput("");
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

    // Re-validate the discount code at submit time (it may have expired or hit cap).
    let activeCode = appliedCode;
    if (activeCode) {
      const stillValid = findValidCode(activeCode.code);
      if (!stillValid) {
        toast.warning("Discount code is no longer valid — removed");
        activeCode = null;
        setAppliedCode(null);
      }
    }

    // Apply discount across the FULL stay (all nights).
    let finalTotal = total;
    let extraNote = "";
    if (activeCode) {
      const { discount, finalTotal: ft } = applyDiscount(total, activeCode.percent);
      finalTotal = ft;
      extraNote = `[Discount ${activeCode.code} -${activeCode.percent}% on ${nights} night${nights > 1 ? "s" : ""} = -$${discount}, final $${ft}]`;
    }

    const composedNotes = [notes.trim(), extraNote].filter(Boolean).join(" ").trim() || undefined;

    const result = addReservation({
      guestId,
      roomId,
      checkIn,
      checkOut,
      status: "confirmed",
      totalAmount: finalTotal,
      notes: composedNotes,
    });

    if (!result.ok) {
      toast.error(t("res.cannot-create"), { description: result.error });
      return;
    }

    if (activeCode) consumeCode(activeCode.id);

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

          {/* Discount code — picker button + popover */}
          <DiscountPicker
            appliedCode={appliedCode}
            onApply={tryApplyCode}
            onRemove={removeCode}
            codeInput={codeInput}
            setCodeInput={setCodeInput}
          />

          {/* Price summary with full-stay discount breakdown */}
          {(() => {
            if (!roomId || !datesValid) return null;
            const room = rooms.find((r) => r.id === roomId);
            if (!room) return null;
            const { total, nights, appliedPlan } = computeStayPrice(
              room.price, room.type, checkIn, checkOut,
            );
            const baseTotal = room.price * nights;
            const nightlyEffective = nights > 0 ? total / nights : room.price;
            const discountInfo = appliedCode ? applyDiscount(total, appliedCode.percent) : null;
            const finalTotal = discountInfo ? discountInfo.finalTotal : total;
            const nightlyAfter = discountInfo && nights > 0 ? finalTotal / nights : nightlyEffective;
            const nightlyDiscount = discountInfo ? nightlyEffective - nightlyAfter : 0;

            return (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nightly rate</span>
                    <span className={discountInfo ? "text-muted-foreground line-through" : "font-medium"}>
                      ${nightlyEffective.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discountInfo && (
                    <>
                      <div className="flex items-center justify-between text-xs text-success">
                        <span>− Discount per night ({appliedCode!.percent}%)</span>
                        <span>−${nightlyDiscount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Nightly after discount</span>
                        <span className="font-medium">
                          ${nightlyAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-border" />

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{nights} {nights > 1 ? "nights" : "night"} · {t("co.room")} {room.number}</span>
                    {appliedPlan && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Tag className="h-3 w-3" /> {appliedPlan.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal ({nights} × nightly)</span>
                    <span className={discountInfo ? "text-muted-foreground line-through" : "font-medium"}>
                      ${total.toLocaleString()}
                    </span>
                  </div>

                  {appliedPlan && total !== baseTotal && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>(rack rate ${baseTotal.toLocaleString()})</span>
                    </div>
                  )}

                  {discountInfo && (
                    <div className="flex items-center justify-between text-xs text-success">
                      <span>Total savings ({appliedCode!.code})</span>
                      <span>−${discountInfo.discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
                    <span className="font-semibold">Final total</span>
                    <span className="font-bold text-lg">
                      ${finalTotal.toLocaleString()}
                    </span>
                  </div>

                  {discountInfo && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Discount applies to the entire stay ({nights} {nights > 1 ? "nights" : "night"}).
                    </p>
                  )}
                </div>
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
