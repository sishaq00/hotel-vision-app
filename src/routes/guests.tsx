import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/guests")({
  head: () => ({
    meta: [
      { title: "Guests — NEXORA OS" },
      { name: "description", content: "Hotel guest directory." },
    ],
  }),
  component: GuestsPage,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function GuestsPage() {
  const allGuests = useHotelStore((s) => s.guests);
  const reservations = useHotelStore((s) => s.reservations);
  const archive = useHotelStore((s) => s.archiveGuest);
  const [query, setQuery] = useState("");

  const guests = useMemo(() => allGuests.filter((g) => !g.archived), [allGuests]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return guests.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q),
    );
  }, [guests, query]);

  return (
    <AppLayout title="Guests" subtitle="Directory of all guests">
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {guests.length} total guest{guests.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No matching guests" : "No guests yet"}
            description={
              query
                ? "Try another search."
                : "Guests are added automatically when you create reservations."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => {
                  const count = reservations.filter((r) => r.guestId === g.id).length;
                  return (
                    <TableRow key={g.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials(g.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{g.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(g.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{g.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{g.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{g.country || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{count}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Archive guest"
                          onClick={() => {
                            const result = archive(g.id);
                            if (result.ok) {
                              toast.success("Guest archived");
                            } else {
                              toast.error("Cannot archive guest", {
                                description: result.error,
                              });
                            }
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
