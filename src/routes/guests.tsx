import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Crown, Ban, Pencil, Plus, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHotelStore } from "@/store/hotel-store";
import { ExportButtons } from "@/components/system/ExportButtons";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { EditGuestDialog } from "@/components/guests/EditGuestDialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

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

type FlagFilter = "all" | "vip" | "dnr" | "active";

function GuestsPage() {
  const { t } = useT();
  const allGuests = useHotelStore((s) => s.guests);
  const reservations = useHotelStore((s) => s.reservations);
  const archive = useHotelStore((s) => s.archiveGuest);
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [flag, setFlag] = useState<FlagFilter>("all");
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  const guests = useMemo(() => allGuests.filter((g) => !g.archived), [allGuests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (flag === "vip" && !g.vip) return false;
      if (flag === "dnr" && !g.doNotRent) return false;
      if (flag === "active") {
        const has = reservations.some(
          (r) =>
            r.guestId === g.id &&
            (r.status === "confirmed" || r.status === "checked-in"),
        );
        if (!has) return false;
      }
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q) ||
        (g.idNumber ?? "").toLowerCase().includes(q) ||
        (g.nationality ?? "").toLowerCase().includes(q) ||
        (g.company ?? "").toLowerCase().includes(q) ||
        (g.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [guests, query, flag, reservations]);

  const stats = useMemo(
    () => ({
      total: guests.length,
      vip: guests.filter((g) => g.vip).length,
      dnr: guests.filter((g) => g.doNotRent).length,
    }),
    [guests],
  );

  const openEdit = (id?: string) => {
    setEditId(id);
    setDialogOpen(true);
  };

  return (
    <AppLayout title={t("nav.guests")} subtitle={t("sub.guests")}>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total guests" value={stats.total} />
          <StatCard label="VIP" value={stats.vip} accent="amber" />
          <StatCard label="Do Not Rent" value={stats.dnr} accent="red" />
          <StatCard label="Showing" value={filtered.length} />
        </div>

        <Card className="border-border/60 shadow-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, email, ID, tag…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={flag} onValueChange={(v) => setFlag(v as FlagFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All guests</SelectItem>
                  <SelectItem value="vip">VIP only</SelectItem>
                  <SelectItem value="dnr">Do Not Rent</SelectItem>
                  <SelectItem value="active">Currently active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                rows={filtered.map((g) => ({
                  Name: g.name,
                  Email: g.email,
                  Phone: g.phone,
                  Country: g.country,
                  Nationality: g.nationality ?? "",
                  "ID Type": g.idType ?? "",
                  "ID Number": g.idNumber ?? "",
                  VIP: g.vip ? "Yes" : "",
                  "Do Not Rent": g.doNotRent ? "Yes" : "",
                  Tags: (g.tags ?? []).join(", "),
                  Created: g.createdAt,
                }))}
                filename="guests"
              />
              <Button size="sm" className="gap-1" onClick={() => openEdit(undefined)}>
                <Plus className="h-4 w-4" /> Add Guest
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={query ? "No matching guests" : "No guests yet"}
              description={
                query
                  ? "Try another search."
                  : "Add a guest manually or create a reservation."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Tags</TableHead>
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
                              {g.profilePhotoDataUrl && (
                                <AvatarImage src={g.profilePhotoDataUrl} alt={g.name} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {initials(g.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Link
                                  to="/guest/$guestId"
                                  params={{ guestId: g.id }}
                                  className="font-medium text-foreground hover:underline"
                                >
                                  {g.name}
                                </Link>
                                {g.vip && (
                                  <Badge className="h-5 gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                                    <Crown className="h-2.5 w-2.5" /> VIP
                                  </Badge>
                                )}
                                {g.doNotRent && (
                                  <Badge variant="outline" className="h-5 gap-0.5 border-destructive/40 text-destructive text-[10px]">
                                    <Ban className="h-2.5 w-2.5" /> DNR
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {g.nationality || g.country || "—"}
                                {g.company ? ` · ${g.company}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-xs">{g.phone || "—"}</div>
                          <div className="text-xs">{g.email || "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.idType ? (
                            <>
                              <div className="capitalize">{g.idType.replace("-", " ")}</div>
                              <div className="font-mono">{g.idNumber || "—"}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(g.tags ?? []).slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                            {(g.tags ?? []).length > 3 && (
                              <span className="text-xs text-muted-foreground">+{(g.tags ?? []).length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => openEdit(g.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Archive"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: "Archive guest?",
                                  description: `Archive ${g.name}? They will be hidden but their reservations are preserved.`,
                                  confirmLabel: "Archive",
                                  destructive: true,
                                });
                                if (!ok) return;
                                const result = archive(g.id);
                                if (result.ok) toast.success("Guest archived");
                                else toast.error("Cannot archive guest", { description: result.error });
                              }}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <EditGuestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        guestId={editId}
      />
    </AppLayout>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "red";
}) {
  const cls =
    accent === "amber"
      ? "text-amber-600"
      : accent === "red"
      ? "text-destructive"
      : "text-foreground";
  return (
    <Card className="border-border/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
    </Card>
  );
}
