// Print: assignments grouped by floor.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print/housekeeping/by-floor")({
  head: () => ({ meta: [{ title: "Housekeeping by Floor" }] }),
  component: PrintByFloor,
});

function PrintByFloor() {
  const rooms = useHotelStore((s) => s.rooms.filter((r) => !r.archived));
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const settings = useHotelStore((s) => s.settings);
  useEffect(() => { setTimeout(() => window.print(), 400); }, []);

  const hkById = useMemo(() => new Map(housekeepers.map((h) => [h.id, h])), [housekeepers]);
  const byFloor = useMemo(() => {
    const m = new Map<number, typeof rooms>();
    rooms.forEach((r) => {
      const f = r.floor;
      if (!m.has(f)) m.set(f, [] as typeof rooms);
      m.get(f)!.push(r);
    });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [rooms]);

  return (
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">{settings.hotelName} — Housekeeping By Floor</h1>
        <p className="text-xs">Generated: {new Date().toLocaleString()}</p>
      </header>
      {byFloor.map(([floor, rs]) => (
        <section key={floor} className="mb-5 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold">Floor {floor} ({rs.length})</h2>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b border-black text-left">
              <th className="p-1">Room</th><th className="p-1">Status</th><th className="p-1">Task</th><th className="p-1">Assigned to</th>
            </tr></thead>
            <tbody>
              {rs.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })).map((r) => (
                <tr key={r.id} className="border-b border-gray-300">
                  <td className="p-1 font-bold">{r.number}</td>
                  <td className="p-1 capitalize">{r.housekeepingStatus ?? "—"}</td>
                  <td className="p-1 capitalize">{r.taskType?.replace("-", " ") ?? "—"}</td>
                  <td className="p-1">{r.assignedHousekeeperId ? hkById.get(r.assignedHousekeeperId)?.name ?? "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
