// Inline VIP / Do-Not-Rent badges to flag guests across reservations lists.
import { Crown, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Guest } from "@/store/hotel-store";

export function GuestFlagBadges({ guest, size = "sm" }: { guest: Guest | undefined; size?: "sm" | "xs" }) {
  if (!guest) return null;
  const cls = size === "xs" ? "text-[9px] h-4 px-1 gap-0.5" : "text-[10px] h-5 px-1.5 gap-1";
  const icon = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className="inline-flex items-center gap-1">
      {guest.vip && (
        <Badge className={`${cls} bg-amber-500/15 text-amber-600 border-amber-500/30`} title="VIP guest">
          <Crown className={icon} /> VIP
        </Badge>
      )}
      {guest.doNotRent && (
        <Badge variant="outline" className={`${cls} border-destructive/40 text-destructive`} title="Do Not Rent">
          <Ban className={icon} /> DNR
        </Badge>
      )}
    </span>
  );
}
