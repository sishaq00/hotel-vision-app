import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderOpen, Plus, Lock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type FolioCharge } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/open-folios")({
  head: () => ({
    meta: [
      { title: "Open Folios — NEXORA OS" },
      { name: "description", content: "Active folios for in-house guests." },
    ],
  }),
  component: OpenFoliosPage,
});

const CATEGORIES: FolioCharge["category"][] = [
  "room", "minibar", "spa", "restaurant", "laundry", "other",
];

function OpenFoliosPage() {
  const folios = useHotelStore((s) => s.folios);
  const guests = useHotelStore((s) => s.guests);
  const reservations = useHotelStore((s) => s.reservations);
  const settings = useHotelStore((s) => s.settings);
  const addFolio = useHotelStore((s) => s.addFolio);
  const postCharge = useHotelStore((s) => s.postFolioCharge);
  const closeFolio = useHotelStore((s) => s.closeFolio);

  const [openNew, setOpenNew] = useState(false);
  const [chargeFolioId, setChargeFolioId] = useState<string | null>(null);

  const open = useMemo(() => folios.filter((f) => f.status === "open"), [folios]);
  const inHouseGuests = useMemo(() => {
    const ids = new Set(reservations.filter((r) => r.status === "checked-in").map((r) => r.guestId));
    return guests.filter((g) => ids.has(g.id) || !g.archived);
  }, [reservations, guests]);

  const fmt = (n: number) =>
    `${settings.currency} ${n.toFixed(2)}`;

  return (
    <AppLayout title="Open Folios" subtitle={`${open.length} active folio${open.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Active folios</h2>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New folio</Button>
            </DialogTrigger>
            <NewFolioDialog
              guests={inHouseGuests}
              onSubmit={(d) => { addFolio(d); toast.success("Folio opened"); setOpenNew(false); }}
            />
          </Dialog>
        </div>
        {open.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No open folios" description="Create a folio to start posting charges to a guest account." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((f) => {
                const guest = guests.find((g) => g.id === f.guestId);
                const total = f.charges.reduce((s, c) => s + c.amount, 0);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{guest?.name ?? "—"}</TableCell>
                    <TableCell>{f.charges.length}</TableCell>
                    <TableCell className="font-mono">{fmt(total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setChargeFolioId(f.id)}>
                        <Plus className="h-3 w-3" /> Post
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { closeFolio(f.id); toast.success("Folio closed"); }}>
                        <Lock className="h-3 w-3" /> Close
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {chargeFolioId && (
        <Dialog open onOpenChange={(o) => !o && setChargeFolioId(null)}>
          <PostChargeDialog
            onSubmit={(c) => {
              postCharge(chargeFolioId, c);
              toast.success("Charge posted");
              setChargeFolioId(null);
            }}
          />
        </Dialog>
      )}
    </AppLayout>
  );
}

function NewFolioDialog({
  guests,
  onSubmit,
}: {
  guests: { id: string; name: string }[];
  onSubmit: (d: { guestId: string; reservationId?: string }) => void;
}) {
  const [guestId, setGuestId] = useState<string>("");
  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader><DialogTitle>Open new folio</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Guest</Label>
          <Select value={guestId} onValueChange={setGuestId}>
            <SelectTrigger><SelectValue placeholder="Pick a guest" /></SelectTrigger>
            <SelectContent>
              {guests.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          if (!guestId) { toast.error("Select a guest"); return; }
          onSubmit({ guestId });
        }}>Open folio</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PostChargeDialog({
  onSubmit,
}: {
  onSubmit: (c: Omit<FolioCharge, "id" | "postedAt">) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<FolioCharge["category"]>("other");
  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader><DialogTitle>Post charge</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Minibar — water" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FolioCharge["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          const a = parseFloat(amount);
          if (!description.trim() || !Number.isFinite(a) || a <= 0) { toast.error("Enter description & amount"); return; }
          onSubmit({ description: description.trim(), amount: a, category });
        }}>Post</Button>
      </DialogFooter>
    </DialogContent>
  );
}
