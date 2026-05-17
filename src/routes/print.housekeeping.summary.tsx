// Print: per-housekeeper summary with cleaning value totals.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print/housekeeping/summary")({
  head: () => ({ meta: [{ title: "Housekeeping Summary" }] }),
  component: PrintSummary,
});

function PrintSummary() {
  const rooms = useHotelStore((s) => s.rooms);
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const settings = useHotelStore((s) => s.settings);
  useEffect(() => { setTimeout(() => window.print(), 400); }, []);

  const stats = housekeepers.map((h) => {
    const my = rooms.filter((r) => r.assignedHousekeeperId === h.id);
    const done = my.filter((r) => r.cleaningFinishedAt);
    const value = done.reduce((s, r) => s + (r.cleaningValue ?? 0), 0);
    const totalMins = done.reduce((s, r) => {
      if (r.cleaningStartedAt && r.cleaningFinishedAt) {
        return s + (new Date(r.cleaningFinishedAt).getTime() - new Date(r.cleaningStartedAt).getTime()) / 60000;
      }
      return s;
    }, 0);
    return { hk: h, assigned: my.length, done: done.length, value, avgMin: done.length ? totalMins / done.length : 0 };
  }).filter((s) => s.assigned > 0);

  return (
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">{settings.hotelName} — Housekeeping Summary</h1>
        <p className="text-xs">Generated: {new Date().toLocaleString()}</p>
      </header>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="border-b-2 border-black text-left">
          <th className="p-2">Housekeeper</th><th className="p-2">Assigned</th><th className="p-2">Done</th>
          <th className="p-2">Avg time</th><th className="p-2">Total value</th>
        </tr></thead>
        <tbody>
          {stats.map(({ hk, assigned, done, value, avgMin }) => (
            <tr key={hk.id} className="border-b border-gray-300">
              <td className="p-2 font-bold">{hk.name}</td>
              <td className="p-2">{assigned}</td>
              <td className="p-2">{done}</td>
              <td className="p-2">{avgMin > 0 ? `${avgMin.toFixed(1)} min` : "—"}</td>
              <td className="p-2">{settings.currency} {value.toFixed(2)}</td>
            </tr>
          ))}
          {stats.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No assignments today.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
