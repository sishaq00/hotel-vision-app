import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History, Search, Filter } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/EmptyState";
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
import { useHotelStore, type AuditEntity } from "@/store/hotel-store";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — NEXORA OS" },
      {
        name: "description",
        content: "Full history of all hotel operations and data changes.",
      },
    ],
  }),
  component: AuditPage,
});

const ENTITIES: (AuditEntity | "all")[] = [
  "all",
  "reservation",
  "room",
  "guest",
  "payment",
  "room-type",
  "settings",
];

const actionColor: Record<string, string> = {
  create: "bg-success/15 text-success border-success/30",
  "check-in": "bg-info/15 text-info border-info/30",
  "check-out": "bg-warning/15 text-warning-foreground border-warning/30",
  cancel: "bg-destructive/15 text-destructive border-destructive/30",
  archive: "bg-muted text-muted-foreground border-border",
  restore: "bg-success/15 text-success border-success/30",
  "status-change": "bg-primary/10 text-primary border-primary/30",
  rename: "bg-primary/10 text-primary border-primary/30",
  "price-change": "bg-primary/10 text-primary border-primary/30",
  update: "bg-muted text-muted-foreground border-border",
};

function AuditPage() {
  const log = useHotelStore((s) => s.auditLog);
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<AuditEntity | "all">("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return log.filter((e) => {
      if (entity !== "all" && e.entity !== entity) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q)
      );
    });
  }, [log, query, entity]);

  return (
    <AppLayout
      title="Audit Log"
      subtitle="Permanent history of every action — nothing is ever lost"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={entity}
              onValueChange={(v) => setEntity(v as AuditEntity | "all")}
            >
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e} value={e} className="capitalize">
                    {e === "all" ? "All entities" : e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {log.length.toLocaleString()} total event{log.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title={log.length === 0 ? "No events yet" : "No matching events"}
            description={
              log.length === 0
                ? "Actions you take will be recorded here automatically."
                : "Try a different search or filter."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Time</TableHead>
                  <TableHead className="w-28">Entity</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const d = new Date(e.timestamp);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {e.entity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${actionColor[e.action] ?? ""}`}
                        >
                          {e.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
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
