import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PackageSearch, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type LostFoundItem } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/lost-found")({
  head: () => ({
    meta: [
      { title: "Lost & Found — NEXORA OS" },
      { name: "description", content: "Track found items and claims." },
    ],
  }),
  component: LostFoundPage,
});

const STATUS_STYLE: Record<LostFoundItem["status"], string> = {
  stored: "bg-info/10 text-info border-info/20",
  claimed: "bg-success/10 text-success border-success/20",
  discarded: "bg-muted text-muted-foreground border-border",
};

function LostFoundPage() {
  const items = useHotelStore((s) => s.lostFoundItems);
  const addItem = useHotelStore((s) => s.addLostFoundItem);
  const updateStatus = useHotelStore((s) => s.updateLostFoundStatus);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | LostFoundItem["status"]>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedBy, setClaimedBy] = useState("");

  const list = useMemo(() => {
    return [...items]
      .filter((i) => filter === "all" || i.status === filter)
      .sort((a, b) => (b.foundAt > a.foundAt ? 1 : -1));
  }, [items, filter]);

  return (
    <AppLayout
      title="Lost & Found"
      subtitle={`${items.filter((i) => i.status === "stored").length} item${
        items.filter((i) => i.status === "stored").length === 1 ? "" : "s"
      } in storage`}
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex gap-2">
            {(["all", "stored", "claimed", "discarded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </DialogTrigger>
            <NewItemDialog
              onSubmit={(d) => {
                addItem(d);
                toast.success("Item registered");
                setOpen(false);
              }}
            />
          </Dialog>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No items"
            description="Register found items so they can be claimed later."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Claimed by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.description}</TableCell>
                    <TableCell className="text-muted-foreground">{i.location}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(i.foundAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                          STATUS_STYLE[i.status],
                        )}
                      >
                        {i.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {i.claimedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {i.status === "stored" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setClaimingId(i.id);
                              setClaimedBy("");
                            }}
                          >
                            Claim
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              updateStatus(i.id, "discarded");
                              toast("Item discarded");
                            }}
                          >
                            Discard
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog
        open={!!claimingId}
        onOpenChange={(o) => !o && setClaimingId(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Claim item</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Claimed by</Label>
            <Input
              autoFocus
              value={claimedBy}
              onChange={(e) => setClaimedBy(e.target.value)}
              placeholder="Guest name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!claimedBy.trim() || !claimingId) {
                  toast.error("Name required");
                  return;
                }
                updateStatus(claimingId, "claimed", claimedBy.trim());
                toast.success("Marked as claimed");
                setClaimingId(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function NewItemDialog({
  onSubmit,
}: {
  onSubmit: (d: { description: string; location: string }) => void;
}) {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Register found item</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Black leather wallet"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location found</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Lobby restroom"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            if (!description.trim() || !location.trim()) {
              toast.error("Description and location required");
              return;
            }
            onSubmit({
              description: description.trim(),
              location: location.trim(),
            });
          }}
        >
          Register
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
