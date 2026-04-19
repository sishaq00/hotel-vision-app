import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NEXORA OS" },
      { name: "description", content: "Hotel performance reports and analytics." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
];

function ReportsPage() {
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const payments = useHotelStore((s) => s.payments);

  const roomStatusData = useMemo(() => {
    const groups = ["available", "occupied", "cleaning", "maintenance"] as const;
    return groups
      .map((g) => ({ name: g, value: rooms.filter((r) => r.status === g).length }))
      .filter((d) => d.value > 0);
  }, [rooms]);

  const reservationStatusData = useMemo(() => {
    const groups = ["confirmed", "checked-in", "checked-out", "cancelled"] as const;
    return groups.map((g) => ({
      name: g,
      count: reservations.filter((r) => r.status === g).length,
    }));
  }, [reservations]);

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((a, p) => a + p.amount, 0);

  const occupancyRate =
    rooms.length === 0
      ? 0
      : Math.round(
          (rooms.filter((r) => r.status === "occupied").length / rooms.length) * 100,
        );

  return (
    <AppLayout title="Reports" subtitle="Performance analytics">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              ${totalRevenue.toLocaleString()}
            </p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Occupancy Rate
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{occupancyRate}%</p>
          </Card>
          <Card className="border-border/60 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Reservations
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{reservations.length}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border/60 p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Room Status</h3>
            <p className="text-xs text-muted-foreground">Distribution by current state</p>
            <div className="mt-4 h-72">
              {roomStatusData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No room data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {roomStatusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="border-border/60 p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Reservation Status</h3>
            <p className="text-xs text-muted-foreground">All-time breakdown</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
