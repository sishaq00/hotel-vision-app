// Reservation history / timeline — read straight from the PostgreSQL
// reservation_events table (created, edited, room moved, checked in/out,
// cancelled, no show) with the acting user and timestamp.
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getReservationEvents, type ReservationEvent } from "@/lib/reservations-rpc";
import { useHotelStore, type Reservation } from "@/store/hotel-store";

const LABELS: Record<string, string> = {
  created: "Reservation created",
  edited: "Reservation edited",
  room_moved: "Room moved",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No show",
};

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
}

function summarize(e: ReservationEvent, roomName: (id?: string) => string): string | null {
  const d = (e.details ?? {}) as Record<string, any>;
  if (e.event_type === "room_moved") {
    return `${roomName(d.from_room_id)} → ${roomName(d.to_room_id)} · ${d.reason ?? ""}`;
  }
  if (e.event_type === "cancelled" || e.event_type === "no_show") {
    const fee = Number(d.fee ?? 0);
    return [d.reason, fee > 0 ? `fee $${fee}` : null].filter(Boolean).join(" · ") || null;
  }
  if (e.event_type === "edited" && d.before && d.after) {
    const keys = ["guest_id", "room_id", "check_in", "check_out", "guests_count", "total_amount", "rate_plan_id", "source", "notes"];
    const changed = keys.filter((k) => JSON.stringify(d.before[k]) !== JSON.stringify(d.after[k]));
    return changed.length ? `Changed: ${changed.join(", ")}` : null;
  }
  return null;
}

export function ReservationHistoryDialog({ reservation, onClose }: Props) {
  const rooms = useHotelStore((s) => s.rooms);
  const [events, setEvents] = useState<ReservationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    setLoading(true); setError(null);
    void getReservationEvents(reservation.id).then((r) => {
      setLoading(false);
      if (r.ok) setEvents(r.data);
      else setError(r.error);
    });
  }, [reservation?.id]);

  if (!reservation) return null;
  const roomName = (id?: string) => {
    const rm = rooms.find((r) => r.id === id);
    return rm ? `Room ${rm.number}` : "—";
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Reservation history</DialogTitle>
          <DialogDescription>
            {reservation.confirmationNumber ?? reservation.id}
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading timeline…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <ol className="relative space-y-4 border-l border-border pl-5">
            <li className="relative">
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Reservation created</span>
                <Badge variant="secondary" className="text-[10px]">system</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(reservation.createdAt).toLocaleString()}
              </p>
            </li>

            {events.map((e) => {
              const detail = summarize(e, roomName);
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{LABELS[e.event_type] ?? e.event_type}</span>
                    {e.user_email && (
                      <Badge variant="outline" className="text-[10px]">{e.user_email}</Badge>
                    )}
                  </div>
                  {detail && <p className="text-xs text-foreground/80">{detail}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}

            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">No further events recorded yet.</li>
            )}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
