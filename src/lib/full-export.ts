// One-click full export: reservations + payments + guests + rooms + audit + print log.
import { downloadExcelWorkbook } from "@/lib/excel";
import { useHotelStore } from "@/store/hotel-store";
import { listPrintLog } from "@/lib/print-log";

export function exportAllToExcel() {
  const state = useHotelStore.getState();
  const guestById = new Map(state.guests.map((g) => [g.id, g]));
  const roomById = new Map(state.rooms.map((r) => [r.id, r]));

  const reservations = state.reservations.map((r) => {
    const g = guestById.get(r.guestId);
    const room = roomById.get(r.roomId);
    return {
      "Confirmation #": r.confirmationNumber ?? "",
      "Guest": g?.name ?? "",
      "Email": g?.email ?? "",
      "Phone": g?.phone ?? "",
      "Country": g?.country ?? "",
      "Room #": room?.number ?? "",
      "Room Type": room?.type ?? "",
      "Check-in": r.checkIn,
      "Check-out": r.checkOut,
      "Status": r.status,
      "Total": r.totalAmount,
      "Source": r.source ?? "",
      "No-show": r.noShow ? "Yes" : "",
      "Notes": r.notes ?? "",
      "Created": r.createdAt,
      "Checked-in at": r.checkedInAt ?? "",
      "Checked-out at": r.checkedOutAt ?? "",
      "Cancelled at": r.cancelledAt ?? "",
      "Invoice #": r.invoice?.invoiceNumber ?? "",
    };
  });

  const payments = state.payments.map((p) => {
    const r = state.reservations.find((x) => x.id === p.reservationId);
    const g = r ? guestById.get(r.guestId) : undefined;
    return {
      "Date": p.date,
      "Guest": g?.name ?? "",
      "Invoice #": r?.invoice?.invoiceNumber ?? "",
      "Method": p.method,
      "Status": p.status,
      "Amount": p.amount,
    };
  });

  const guests = state.guests.map((g) => ({
    "Name": g.name,
    "Email": g.email,
    "Phone": g.phone,
    "Country": g.country,
    "VIP": g.vip ? "Yes" : "",
    "DNR": g.doNotRent ? "Yes" : "",
    "Notes": g.notes ?? "",
    "Archived": g.archived ? "Yes" : "",
    "Created": g.createdAt,
  }));

  const rooms = state.rooms.map((r) => ({
    "Number": r.number,
    "Type": r.type,
    "Floor": r.floor,
    "Price/night": r.price,
    "Status": r.status,
    "Housekeeping": r.housekeepingStatus ?? "",
    "Archived": r.archived ? "Yes" : "",
  }));

  const audit = state.auditLog.map((a) => ({
    "Time": a.timestamp,
    "Action": a.action,
    "Entity": a.entity,
    "Entity ID": a.entityId,
    "Description": a.description,
    "Metadata": a.metadata ? JSON.stringify(a.metadata) : "",
  }));

  const printLog = listPrintLog().map((e) => ({
    "Time": e.at,
    "User": e.user,
    "Type": e.kind,
    "Reservation ID": e.reservationId,
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  downloadExcelWorkbook(
    [
      { name: "Reservations", rows: reservations },
      { name: "Payments", rows: payments },
      { name: "Guests", rows: guests },
      { name: "Rooms", rows: rooms },
      { name: "Audit Log", rows: audit },
      { name: "Print Log", rows: printLog },
    ],
    `nexora-full-export-${stamp}`,
  );
}
