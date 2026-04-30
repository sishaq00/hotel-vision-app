import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/group-master")({
  head: () => ({
    meta: [
      { title: "Group Master — NEXORA OS" },
      { name: "description", content: "Group reservations with unified rate." },
    ],
  }),
  component: GroupMasterPage,
});

function GroupMasterPage() {
  const { t } = useT();
  const groups = useHotelStore((s) => s.groupMasters);
  const reservations = useHotelStore((s) => s.reservations);
  const settings = useHotelStore((s) => s.settings);
  const add = useHotelStore((s) => s.addGroupMaster);

  const [open, setOpen] = useState(false);
  const list = useMemo(() => [...groups].sort((a, b) => (a.arrivalDate < b.arrivalDate ? 1 : -1)), [groups]);

  return (
    <AppLayout title={t("nav.group-master")} subtitle={`${groups.length} group${groups.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Group bookings</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New group</Button>
            </DialogTrigger>
            <NewGroupDialog onSubmit={(g) => { add(g); toast.success("Group created"); setOpen(false); }} />
          </Dialog>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Users} title="No groups" description="Create a group master to manage block bookings with a unified rate." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Unified rate</TableHead>
                <TableHead>Linked rooms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((g) => {
                const linked = reservations.filter((r) => r.groupMasterId === g.id).length;
                return (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="font-medium">{g.name}</div>
                      {g.notes && <div className="text-xs text-muted-foreground line-clamp-1">{g.notes}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {g.contactName ?? "—"}{g.contactPhone ? ` · ${g.contactPhone}` : ""}
                    </TableCell>
                    <TableCell className="text-xs">{g.arrivalDate} → {g.departureDate}</TableCell>
                    <TableCell className="font-mono">{g.rateOverride != null ? `${settings.currency} ${g.rateOverride.toFixed(2)}` : "—"}</TableCell>
                    <TableCell>{linked}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}

function NewGroupDialog({
  onSubmit,
}: {
  onSubmit: (g: {
    name: string; contactName?: string; contactPhone?: string;
    arrivalDate: string; departureDate: string; rateOverride?: number; notes?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [arrivalDate, setArrivalDate] = useState(today);
  const [departureDate, setDepartureDate] = useState(tomorrow);
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader><DialogTitle>New group master</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ACME Conference 2026" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Contact name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Arrival</Label><Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Departure</Label><Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Unified nightly rate (optional)</Label>
          <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          if (!name.trim()) { toast.error("Name required"); return; }
          if (departureDate <= arrivalDate) { toast.error("Departure must be after arrival"); return; }
          const r = parseFloat(rate);
          onSubmit({
            name: name.trim(),
            contactName: contactName.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            arrivalDate, departureDate,
            rateOverride: Number.isFinite(r) && r > 0 ? r : undefined,
            notes: notes.trim() || undefined,
          });
        }}>Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}
