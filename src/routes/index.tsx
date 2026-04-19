import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BedDouble,
  CalendarCheck,
  DoorOpen,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotelStore, todayISO } from "@/store/hotel-store";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const rooms = useHotelStore((s) => s.rooms);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);

  const kpis = useMemo(() => {
    const today = todayISO();
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    const available = rooms.filter((r) => r.status === "available").length;
    const checkInsToday = reservations.filter(
      (r) => r.checkIn === today && r.status !== "cancelled",
    ).length;
    const checkOutsToday = reservations.filter(
      (r) => r.checkOut === today && r.status !== "cancelled",
    ).length;
    return { occupied, available, checkInsToday, checkOutsToday };
  }, [rooms, reservations]);

  const recent = useMemo(
    () =>
      [...reservations]
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
        .slice(0, 5),
    [reservations],
  );

  const occupancyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d) => ({ day: d, occupancy: 0 }));
  }, []);

  const revenueData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((m) => ({ month: m, revenue: 0 }));
  }, []);

  const guestById = (id: string) => guests.find((g) => g.id === id);
  const roomById = (id: string) => rooms.find((r) => r.id === id);

  return (
    <AppLayout title="Dashboard" subtitle="Overview of your hotel operations">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Occupied Rooms"
            value={kpis.occupied}
            icon={BedDouble}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <KpiCard
            label="Available Rooms"
            value={kpis.available}
            icon={DoorOpen}
            iconBg="bg-success/10"
            iconColor="text-success"
          />
          <KpiCard
            label="Check-ins Today"
            value={kpis.checkInsToday}
            icon={CalendarCheck}
            iconBg="bg-info/10"
            iconColor="text-info"
          />
          <KpiCard
            label="Check-outs Today"
            value={kpis.checkOutsToday}
            icon={LogOut}
            iconBg="bg-warning/15"
            iconColor="text-warning-foreground"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-border/60 p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Occupancy Trend
                </h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyData}>
                  <defs>
                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="occupancy"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#occGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-border/60 p-5 shadow-card">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent reservations */}
        <Card className="border-border/60 shadow-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Recent Reservations
              </h3>
              <p className="text-xs text-muted-foreground">
                Latest 5 bookings across the hotel
              </p>
            </div>
            <NewReservationDialog />
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No reservations yet"
              description="Start by adding rooms, then create your first reservation to see it here."
              action={<NewReservationDialog />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => {
                  const g = guestById(r.guestId);
                  const rm = roomById(r.roomId);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{g?.name ?? "—"}</TableCell>
                      <TableCell>{rm ? `Room ${rm.number}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.checkIn}</TableCell>
                      <TableCell className="text-muted-foreground">{r.checkOut}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right font-semibold">
                        ${r.totalAmount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
