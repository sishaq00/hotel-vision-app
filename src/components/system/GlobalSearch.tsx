// Global search palette (Ctrl+K). Fuzzy search across reservations, guests, rooms, invoices.
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
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
import { useT } from "@/lib/i18n";
import { BedDouble, FileText, Receipt, User, ArrowRight } from "lucide-react";

interface SearchItem {
  type: "reservation" | "guest" | "room" | "invoice" | "nav";
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useT();

  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);

  // Ctrl+K / Cmd+K opens it
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const items = useMemo<SearchItem[]>(() => {
    const guestById = new Map(guests.map((g) => [g.id, g]));
    const roomById = new Map(rooms.map((r) => [r.id, r]));

    const resItems: SearchItem[] = reservations.map((r) => {
      const g = guestById.get(r.guestId);
      const room = roomById.get(r.roomId);
      return {
        type: "reservation",
        id: r.id,
        title: `${g?.name ?? "—"} · Room ${room?.number ?? "—"}`,
        subtitle: `${r.confirmationNumber ?? r.id.slice(0, 8)} · ${r.checkIn} → ${r.checkOut} · ${r.status}`,
        to: "/search-reservations",
      };
    });

    const guestItems: SearchItem[] = guests.map((g) => ({
      type: "guest",
      id: g.id,
      title: g.name,
      subtitle: [g.phone, g.email, g.country].filter(Boolean).join(" · "),
      to: "/guests",
    }));

    const roomItems: SearchItem[] = rooms.filter((r) => !r.archived).map((r) => ({
      type: "room",
      id: r.id,
      title: `Room ${r.number}`,
      subtitle: `${r.type} · Floor ${r.floor} · ${r.status}`,
      to: "/rooms",
    }));

    const invoiceItems: SearchItem[] = reservations
      .filter((r) => r.invoice)
      .map((r) => {
        const g = guestById.get(r.guestId);
        return {
          type: "invoice",
          id: r.invoice!.invoiceNumber,
          title: r.invoice!.invoiceNumber,
          subtitle: `${g?.name ?? "—"} · ${r.invoice!.currency} ${r.invoice!.total.toFixed(2)}`,
          to: "/search-invoice",
        };
      });

    const navItems: SearchItem[] = [
      { type: "nav", id: "n-dash", title: t("nav.dashboard"), subtitle: "/", to: "/" },
      { type: "nav", id: "n-arr", title: t("nav.arrivals"), subtitle: "/arrivals", to: "/arrivals" },
      { type: "nav", id: "n-dep", title: t("nav.departures"), subtitle: "/departures", to: "/departures" },
      { type: "nav", id: "n-ih", title: t("nav.in-house"), subtitle: "/in-house", to: "/in-house" },
      { type: "nav", id: "n-rep", title: t("nav.reports"), subtitle: "/reports", to: "/reports" },
      { type: "nav", id: "n-set", title: t("nav.settings"), subtitle: "/settings", to: "/settings" },
      { type: "nav", id: "n-na", title: t("nav.night-audit"), subtitle: "/night-audit", to: "/night-audit" },
      { type: "nav", id: "n-av", title: t("nav.availability"), subtitle: "/availability", to: "/availability" },
    ];

    return [...resItems, ...guestItems, ...roomItems, ...invoiceItems, ...navItems];
  }, [reservations, guests, rooms, t]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "subtitle"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items],
  );

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 30);
    return fuse.search(query).slice(0, 50).map((r) => r.item);
  }, [query, fuse, items]);

  const grouped = useMemo(() => {
    const map = new Map<SearchItem["type"], SearchItem[]>();
    results.forEach((it) => {
      if (!map.has(it.type)) map.set(it.type, []);
      map.get(it.type)!.push(it);
    });
    return map;
  }, [results]);

  const groupLabels: Record<SearchItem["type"], string> = {
    reservation: t("nav.reservations"),
    guest: t("nav.guests"),
    room: t("nav.rooms"),
    invoice: t("nav.search-invoice"),
    nav: t("nav.more"),
  };

  const iconFor = (t: SearchItem["type"]) => {
    switch (t) {
      case "reservation": return FileText;
      case "guest": return User;
      case "room": return BedDouble;
      case "invoice": return Receipt;
      case "nav": return ArrowRight;
    }
  };

  const goto = (it: SearchItem) => {
    setOpen(false);
    setQuery("");
    navigate({ to: it.to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={`${t("common.search")}…  (Ctrl+K)`}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t("common.empty")}</CommandEmpty>
        {Array.from(grouped.entries()).map(([type, list]) => {
          const Icon = iconFor(type);
          return (
            <CommandGroup key={type} heading={groupLabels[type]}>
              {list.map((it) => (
                <CommandItem
                  key={`${it.type}-${it.id}`}
                  value={`${it.title} ${it.subtitle}`}
                  onSelect={() => goto(it)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{it.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{it.subtitle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
