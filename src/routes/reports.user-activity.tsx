import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useActivityStore, type ActivityAction } from "@/store/activity-store";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reports/user-activity")({
  component: ReportPage,
});

function ReportPage() {
  return (
    <AppLayout title="User Activity Report">
      <PermissionGate permission="reports.user-activity">
        <ReportInner />
      </PermissionGate>
    </AppLayout>
  );
}

const ACTION_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  "reservation.create": "New reservation",
  "reservation.edit": "Edit reservation",
  "reservation.cancel": "Cancel reservation",
  "reservation.extend": "Extend stay",
  checkin: "Check-in",
  checkout: "Check-out",
  "payment.record": "Cash payment",
  "payment.refund": "Refund",
  "night-audit": "Night Audit",
  "shift.open": "Open shift",
  "shift.close": "Close shift",
  "room.status-change": "Room status change",
  "user.create": "Create user",
  "user.update": "Update user",
  "user.delete": "Delete user",
};

function ReportInner() {
  const entries = useActivityStore((s) => s.entries);
  const users = useAuthStore((s) => s.users);
  const me = useAuthStore((s) =>
    s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null,
  );
  const isAdmin = me?.role === "admin";

  const [userFilter, setUserFilter] = useState<string>(isAdmin ? "all" : me?.id ?? "all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!isAdmin && e.userId !== me?.id) return false;
      if (userFilter !== "all" && e.userId !== userFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      const ts = e.timestamp.slice(0, 10);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [entries, userFilter, actionFilter, from, to, isAdmin, me?.id]);

  // Per-user summary
  const summary = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        total: number;
        reservations: number;
        checkins: number;
        checkouts: number;
        extensions: number;
        cashCollected: number;
        cancellations: number;
      }
    >();
    for (const e of filtered) {
      let row = map.get(e.userId);
      if (!row) {
        row = {
          userId: e.userId,
          userName: e.userName,
          total: 0,
          reservations: 0,
          checkins: 0,
          checkouts: 0,
          extensions: 0,
          cashCollected: 0,
          cancellations: 0,
        };
        map.set(e.userId, row);
      }
      row.total++;
      if (e.action === "reservation.create") row.reservations++;
      if (e.action === "checkin") row.checkins++;
      if (e.action === "checkout") row.checkouts++;
      if (e.action === "reservation.extend") row.extensions++;
      if (e.action === "reservation.cancel") row.cancellations++;
      if (e.action === "payment.record" && e.amount) row.cashCollected += e.amount;
      if (e.action === "checkout" && e.amount && e.details && (e.details as { paid?: boolean }).paid) {
        row.cashCollected += e.amount;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.cashCollected - a.cashCollected);
  }, [filtered]);

  const exportCSV = () => {
    const header = [
      "Timestamp",
      "User",
      "Action",
      "Description",
      "Amount",
      "Entity",
    ];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.userName,
      ACTION_LABEL[e.action] ?? e.action,
      e.description.replaceAll('"', '""'),
      e.amount?.toFixed(2) ?? "",
      `${e.entityType}:${e.entityId ?? ""}`,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "")}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Activity Report</h1>
        <p className="text-sm text-muted-foreground">
          Every action taken by every user — reservations, check-ins, cash collected, and more.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">User</Label>
            <Select value={userFilter} onValueChange={setUserFilter} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} (@{u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(ACTION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportCSV} className="w-full">
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Per-user summary */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Per-user summary ({summary.length} {summary.length === 1 ? "user" : "users"})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-right">Actions</th>
              <th className="px-3 py-2 text-right">Reservations</th>
              <th className="px-3 py-2 text-right">Check-ins</th>
              <th className="px-3 py-2 text-right">Check-outs</th>
              <th className="px-3 py-2 text-right">Extensions</th>
              <th className="px-3 py-2 text-right">Cancellations</th>
              <th className="px-3 py-2 text-right">Cash collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No activity for the selected filters.
                </td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.userId} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.userName}</td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right">{row.reservations}</td>
                  <td className="px-3 py-2 text-right">{row.checkins}</td>
                  <td className="px-3 py-2 text-right">{row.checkouts}</td>
                  <td className="px-3 py-2 text-right">{row.extensions}</td>
                  <td className="px-3 py-2 text-right">{row.cancellations}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">
                    ${row.cashCollected.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Detailed log */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Detailed log ({filtered.length} {filtered.length === 1 ? "entry" : "entries"})
        </div>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No entries.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{e.userName}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {ACTION_LABEL[e.action] ?? e.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{e.description}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {e.amount ? `$${e.amount.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
