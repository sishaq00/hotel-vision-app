// Print: all current housekeeping assignments grouped by housekeeper.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print/housekeeping/all")({
  head: () => ({ meta: [{ title: "Housekeeping Assignments" }] }),
  component: PrintAll,
});

function PrintAll() {
  const rooms = useHotelStore((s) => s.rooms);
  const housekeepers = useHotelStore((s) => s.housekeepers);
  const settings = useHotelStore((s) => s.settings);

  useEffect(() => { setTimeout(() => window.print(), 400); }, []);

  const groups = housekeepers
    .map((h) => ({ hk: h, rooms: rooms.filter((r) => r.assignedHousekeeperId === h.id) }))
    .filter((g) => g.rooms.length > 0);

  return (
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">{settings.hotelName} — Housekeeping Assignments</h1>
        <p className="text-xs">Generated: {new Date().toLocaleString()}</p>
      </header>
      {groups.map(({ hk, rooms: rs }) => (
        <section key={hk.id} className="mb-6 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold">{hk.name} <span className="font-normal">({rs.length} rooms)</span></h2>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b border-black text-left">
              <th className="p-1">Room</th><th className="p-1">Floor</th><th className="p-1">Type</th>
              <th className="p-1">Task</th><th className="p-1">Status</th><th className="p-1">Done at</th>
            </tr></thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.id} className="border-b border-gray-300">
                  <td className="p-1 font-bold">{r.number}</td>
                  <td className="p-1">{r.floor}</td>
                  <td className="p-1">{r.bedCode || r.typeCode}</td>
                  <td className="p-1 capitalize">{r.taskType?.replace("-", " ") ?? "—"}</td>
                  <td className="p-1 capitalize">{r.housekeepingStatus ?? "—"}</td>
                  <td className="p-1">{r.cleaningFinishedAt ? new Date(r.cleaningFinishedAt).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-8 text-xs">
            <div>Signature: ________________________</div>
            <div>Date: __________</div>
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="text-sm">No assignments.</p>}
    </div>
  );
}
