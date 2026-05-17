import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wrench, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useHotelStore,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — NEXORA OS" },
      { name: "description", content: "Maintenance tickets, priorities and assignment." },
    ],
  }),
  component: MaintenancePage,
});

const PRIORITY_STYLE: Record<MaintenancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/10 text-info border-info/20",
  high: "bg-warning/15 text-warning-foreground border-warning/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_STYLE: Record<MaintenanceStatus, string> = {
  open: "bg-warning/15 text-warning-foreground border-warning/30",
  "in-progress": "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

function MaintenancePage() {
  const tickets = useHotelStore((s) => s.maintenanceTickets);
  const rooms = useHotelStore((s) => s.rooms);
  const addTicket = useHotelStore((s) => s.addMaintenanceTicket);
  const updateStatus = useHotelStore((s) => s.updateMaintenanceStatus);

  const [filter, setFilter] = useState<"all" | MaintenanceStatus>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return [...tickets]
      .filter((t) => filter === "all" || t.status === filter)
      .sort((a, b) => (b.reportedAt > a.reportedAt ? 1 : -1));
  }, [tickets, filter]);

  return (
    <AppLayout
      title="Maintenance"
      subtitle={`${tickets.filter((t) => t.status !== "resolved").length} open tickets`}
    >
      <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: "Open",        value: tickets.filter(t=>t.status==="open").length,        bar: "border-l-rose-500"   },
          { label: "In progress", value: tickets.filter(t=>t.status==="in-progress").length, bar: "border-l-amber-500"  },
          { label: "Resolved",    value: tickets.filter(t=>t.status==="resolved").length,    bar: "border-l-emerald-500"},
          { label: "Total",       value: tickets.length,                                      bar: "border-l-slate-400"  },
        ]).map(({label,value,bar}) => (
          <div key={label} className={`relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm border-l-4 ${bar}`}>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "in-progress", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New ticket
              </Button>
            </DialogTrigger>
            <NewTicketDialog
              onSubmit={(data) => {
                addTicket(data);
                toast.success("Ticket created");
                setOpen(false);
              }}
              rooms={rooms}
            />
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance tickets"
            description="Create a ticket to track an issue."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.area}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                          PRIORITY_STYLE[t.priority],
                        )}
                      >
                        {t.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
                          STATUS_STYLE[t.status],
                        )}
                      >
                        {t.status.replace("-", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.reportedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.assignee ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={t.status}
                        onValueChange={(v) =>
                          updateStatus(t.id, v as MaintenanceStatus)
                        }
                      >
                        <SelectTrigger className="ml-auto h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in-progress">In progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
}

function NewTicketDialog({
  rooms,
  onSubmit,
}: {
  rooms: ReturnType<typeof useHotelStore.getState>["rooms"];
  onSubmit: (d: {
    area: string;
    description: string;
    priority: MaintenancePriority;
    roomId?: string;
    assignee?: string;
  }) => void;
}) {
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");
  const [roomId, setRoomId] = useState<string>("none");
  const [assignee, setAssignee] = useState("");

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>New maintenance ticket</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Room (optional)</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No specific room —</SelectItem>
              {rooms
                .filter((r) => !r.archived)
                .map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.number} · {r.typeCode}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Area / location</Label>
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Lobby, Pool deck, Room 204 bathroom"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as MaintenancePriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            if (!area.trim() || !description.trim()) {
              toast.error("Area and description are required");
              return;
            }
            onSubmit({
              area: area.trim(),
              description: description.trim(),
              priority,
              roomId: roomId === "none" ? undefined : roomId,
              assignee: assignee.trim() || undefined,
            });
          }}
        >
          Create ticket
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
