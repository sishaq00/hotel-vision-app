// Dashboard mini-charts: 14-day revenue & occupancy trends from reservations.
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useHotelStore } from "@/store/hotel-store";

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardCharts() {
  const reservations = useHotelStore((s) => s.reservations);
  const rooms = useHotelStore((s) => s.rooms);

  const data = useMemo(() => {
    const sellable = rooms.filter((r) => !r.archived && r.status !== "maintenance").length || 1;
    const days: Array<{ date: string; label: string; revenue: number; occupancy: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      const iso = d.toISOString().slice(0, 10);
      // Revenue: sum of reservations created on this day
      const revenue = reservations
        .filter((r) => r.createdAt.slice(0, 10) === iso && r.status !== "cancelled")
        .reduce((s, r) => s + (r.totalAmount ?? 0), 0);
      // Occupancy: reservations spanning that night
      const occupied = reservations.filter(
        (r) => r.checkIn <= iso && r.checkOut > iso && r.status !== "cancelled",
      ).length;
      days.push({
        date: iso,
        label: fmtDay(iso),
        revenue: Math.round(revenue),
        occupancy: Math.round((occupied / sellable) * 100),
      });
    }
    return days;
  }, [reservations, rooms]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card className="p-4 shadow-card">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">Revenue (last 14 days)</h3>
          <span className="text-xs text-muted-foreground">
            Total: {data.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
          </span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 shadow-card">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">Occupancy %</h3>
          <span className="text-xs text-muted-foreground">
            Avg: {(data.reduce((s, d) => s + d.occupancy, 0) / data.length).toFixed(1)}%
          </span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}%`, "Occupancy"]}
              />
              <Bar dataKey="occupancy" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
