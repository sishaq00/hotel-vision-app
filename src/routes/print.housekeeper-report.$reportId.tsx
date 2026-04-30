// Print: a single submitted housekeeper report.
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/print/housekeeper-report/$reportId")({
  head: () => ({ meta: [{ title: "Housekeeper Report" }] }),
  component: PrintReport,
});

function PrintReport() {
  const { reportId } = useParams({ from: "/print/housekeeper-report/$reportId" });
  const report = useHotelStore((s) => s.housekeeperReports.find((r) => r.id === reportId));
  const settings = useHotelStore((s) => s.settings);
  useEffect(() => { setTimeout(() => window.print(), 400); }, []);

  if (!report) return <div className="p-8">Report not found.</div>;

  return (
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black print:p-0">
      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">{settings.hotelName} — Housekeeper Report</h1>
        <p className="text-xs">
          {report.housekeeperName} · {report.date} · Submitted {new Date(report.submittedAt).toLocaleString()}
        </p>
      </header>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="border-b border-black text-left">
          <th className="p-1">Room</th><th className="p-1">Task</th><th className="p-1">Started</th>
          <th className="p-1">Finished</th><th className="p-1">Notes</th>
        </tr></thead>
        <tbody>
          {report.rooms.map((r) => (
            <tr key={r.roomId} className="border-b border-gray-300">
              <td className="p-1 font-bold">{r.roomNumber}</td>
              <td className="p-1 capitalize">{r.taskType?.replace("-", " ") ?? "—"}</td>
              <td className="p-1">{r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : "—"}</td>
              <td className="p-1">{new Date(r.finishedAt).toLocaleTimeString()}</td>
              <td className="p-1">{r.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
        <div>Housekeeper signature: ________________________</div>
        <div>Manager signature: ________________________</div>
      </div>
    </div>
  );
}
