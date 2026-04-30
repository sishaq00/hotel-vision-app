// Quick print picker — Ctrl+Shift+P. Pick a reservation to print A4 or 80mm.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useHotelStore } from "@/store/hotel-store";
import { Printer, Receipt } from "lucide-react";
import { recordPrint } from "@/lib/print-log";

export function PrintPicker() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+P (don't conflict with browser print Ctrl+P)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const printable = reservations.filter((r) => r.invoice).slice(0, 50);

  const open80mm = (id: string) => {
    recordPrint(id, "receipt-80mm");
    window.open(`/print-receipt/${id}`, "_blank");
    setOpen(false);
  };
  const openA4 = (id: string) => {
    recordPrint(id, "invoice-a4");
    window.open(`/print-invoice/${id}`, "_blank");
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search reservation to print…" />
      <CommandList>
        <CommandEmpty>No reservations with invoices.</CommandEmpty>
        <CommandGroup heading="Print invoice">
          {printable.map((r) => {
            const g = guests.find((x) => x.id === r.guestId);
            const room = rooms.find((x) => x.id === r.roomId);
            const label = `${g?.name ?? "—"} · Room ${room?.number ?? "—"} · ${r.invoice?.invoiceNumber ?? ""}`;
            return (
              <div key={r.id} className="flex items-center gap-1 px-1">
                <CommandItem
                  value={`a4-${label}`}
                  onSelect={() => openA4(r.id)}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4" />
                  <span className="ml-2">{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">A4</span>
                </CommandItem>
                <CommandItem
                  value={`80-${label}`}
                  onSelect={() => open80mm(r.id)}
                  className="w-16 justify-center"
                >
                  <Receipt className="h-4 w-4" />
                  <span className="ml-1 text-xs">80mm</span>
                </CommandItem>
              </div>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
