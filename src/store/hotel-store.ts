import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";
// Free-form room type to support unlimited custom hotel layouts
export type RoomType = string;

export interface Room {
  id: string;
  number: string;
  type: RoomType;        // e.g. "Royal Suite", "Family Room"
  typeCode: string;      // short code shown under the name, e.g. "RS", "FAM"
  floor: number;
  price: number;
  status: RoomStatus;
  archived?: boolean;    // soft-delete flag — record is preserved
  archivedAt?: string;
}

export type ReservationStatus = "confirmed" | "checked-in" | "checked-out" | "cancelled";

export interface InvoiceSnapshot {
  invoiceNumber: string;
  issuedAt: string;
  nights: number;
  ratePerNight: number;
  subtotal: number;
  taxRate: number;       // e.g. 0.15
  taxAmount: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  total: number;
  currency: string;
}

export interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string; // ISO date (planned)
  checkOut: string;
  status: ReservationStatus;
  totalAmount: number;
  createdAt: string;
  // Real timestamps captured on action
  checkedInAt?: string;
  checkedOutAt?: string;
  cancelledAt?: string;
  // Invoice snapshot — locked at check-out
  invoice?: InvoiceSnapshot;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  createdAt: string;
  archived?: boolean;
  archivedAt?: string;
}

export type PaymentStatus = "paid" | "pending" | "refunded";
export type PaymentMethod = "card" | "cash" | "transfer";

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
}

export interface HotelSettings {
  hotelName: string;
  currency: string;
  timezone: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxRate: number;        // 0..1 (e.g. 0.15 = 15% VAT)
  serviceFeeRate: number; // 0..1 (e.g. 0.10 = 10% service)
  invoicePrefix: string;  // e.g. "INV"
  invoiceCounter: number; // monotonically increasing
}

// ---- Audit log -------------------------------------------------------------

export type AuditEntity =
  | "room"
  | "reservation"
  | "guest"
  | "payment"
  | "settings"
  | "room-type";

export type AuditAction =
  | "create"
  | "update"
  | "status-change"
  | "check-in"
  | "check-out"
  | "cancel"
  | "archive"
  | "restore"
  | "rename"
  | "price-change";

export interface AuditEntry {
  id: string;
  timestamp: string;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  description: string;
  metadata?: Record<string, unknown>;
}

interface HotelState {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  payments: Payment[];
  settings: HotelSettings;
  auditLog: AuditEntry[];

  // Rooms
  addRoom: (room: Omit<Room, "id">) => string;
  updateRoomStatus: (id: string, status: RoomStatus) => void;
  archiveRoom: (id: string) => { ok: boolean; error?: string };
  restoreRoom: (id: string) => void;
  renameRoomType: (
    oldType: string,
    next: { type: string; typeCode: string },
  ) => number;
  setRoomTypePrice: (type: string, price: number) => number;

  // Guests
  addGuest: (guest: Omit<Guest, "id" | "createdAt">) => string;
  archiveGuest: (id: string) => { ok: boolean; error?: string };
  restoreGuest: (id: string) => void;

  // Reservations
  addReservation: (
    r: Omit<Reservation, "id" | "createdAt">,
  ) => { ok: true; id: string } | { ok: false; error: string };
  hasRoomConflict: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    ignoreReservationId?: string,
  ) => Reservation | null;
  checkIn: (id: string) => void;
  checkOut: (id: string, opts?: { paymentMethod?: PaymentMethod; markPaid?: boolean }) => InvoiceSnapshot | null;
  cancelReservation: (id: string) => void;
  previewInvoice: (reservationId: string) => InvoiceSnapshot | null;

  // Payments
  addPayment: (p: Omit<Payment, "id">) => string;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;

  // Settings
  updateSettings: (s: Partial<HotelSettings>) => void;

  // Audit
  clearAuditLog: () => void;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// SSR-safe storage: returns a no-op store on the server, real localStorage on the client.
const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
});

export const useHotelStore = create<HotelState>()(
  persist(
    (set, get) => {
      // Internal helper to append an audit entry
      const log = (entry: Omit<AuditEntry, "id" | "timestamp">) => {
        set((s) => ({
          auditLog: [
            {
              ...entry,
              id: uid(),
              timestamp: new Date().toISOString(),
            },
            ...s.auditLog,
          ].slice(0, 1000), // cap to last 1000 events
        }));
      };

      return {
        rooms: [],
        reservations: [],
        guests: [],
        payments: [],
        auditLog: [],
        settings: {
          hotelName: "NEXORA OS",
          currency: "USD",
          timezone: "UTC",
          contactEmail: "",
          contactPhone: "",
          address: "",
        },

        // -------------------- Rooms --------------------
        addRoom: (room) => {
          const id = uid();
          set((s) => ({ rooms: [...s.rooms, { ...room, id }] }));
          log({
            entity: "room",
            entityId: id,
            action: "create",
            description: `Room ${room.number} created (${room.type})`,
          });
          return id;
        },
        updateRoomStatus: (id, status) => {
          const room = get().rooms.find((r) => r.id === id);
          if (!room || room.status === status) return;
          set((s) => ({
            rooms: s.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
          }));
          log({
            entity: "room",
            entityId: id,
            action: "status-change",
            description: `Room ${room.number}: ${room.status} → ${status}`,
            metadata: { from: room.status, to: status },
          });
        },
        archiveRoom: (id) => {
          const room = get().rooms.find((r) => r.id === id);
          if (!room) return { ok: false, error: "Room not found" };
          // Block archiving if active reservations exist
          const active = get().reservations.find(
            (r) =>
              r.roomId === id &&
              (r.status === "confirmed" || r.status === "checked-in"),
          );
          if (active) {
            return {
              ok: false,
              error: "Cannot archive: room has active or upcoming reservations.",
            };
          }
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.id === id
                ? { ...r, archived: true, archivedAt: new Date().toISOString() }
                : r,
            ),
          }));
          log({
            entity: "room",
            entityId: id,
            action: "archive",
            description: `Room ${room.number} archived`,
          });
          return { ok: true };
        },
        restoreRoom: (id) => {
          const room = get().rooms.find((r) => r.id === id);
          if (!room) return;
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.id === id ? { ...r, archived: false, archivedAt: undefined } : r,
            ),
          }));
          log({
            entity: "room",
            entityId: id,
            action: "restore",
            description: `Room ${room.number} restored`,
          });
        },

        renameRoomType: (oldType, next) => {
          const code = next.typeCode.trim().toUpperCase();
          let count = 0;
          set((s) => ({
            rooms: s.rooms.map((r) => {
              if (r.type !== oldType) return r;
              count++;
              return { ...r, type: next.type.trim(), typeCode: code };
            }),
          }));
          if (count > 0) {
            log({
              entity: "room-type",
              entityId: oldType,
              action: "rename",
              description: `Type "${oldType}" → "${next.type}" (${code}) · ${count} room${count === 1 ? "" : "s"}`,
              metadata: { from: oldType, to: next.type, code, count },
            });
          }
          return count;
        },

        setRoomTypePrice: (type, price) => {
          let count = 0;
          set((s) => ({
            rooms: s.rooms.map((r) => {
              if (r.type !== type) return r;
              count++;
              return { ...r, price };
            }),
          }));
          if (count > 0) {
            log({
              entity: "room-type",
              entityId: type,
              action: "price-change",
              description: `Type "${type}" price set to $${price} · ${count} room${count === 1 ? "" : "s"}`,
              metadata: { type, price, count },
            });
          }
          return count;
        },

        // -------------------- Guests --------------------
        addGuest: (guest) => {
          const id = uid();
          set((s) => ({
            guests: [
              ...s.guests,
              { ...guest, id, createdAt: new Date().toISOString() },
            ],
          }));
          log({
            entity: "guest",
            entityId: id,
            action: "create",
            description: `Guest "${guest.name}" added`,
          });
          return id;
        },
        archiveGuest: (id) => {
          const guest = get().guests.find((g) => g.id === id);
          if (!guest) return { ok: false, error: "Guest not found" };
          const active = get().reservations.find(
            (r) =>
              r.guestId === id &&
              (r.status === "confirmed" || r.status === "checked-in"),
          );
          if (active) {
            return {
              ok: false,
              error: "Cannot archive: guest has active reservations.",
            };
          }
          set((s) => ({
            guests: s.guests.map((g) =>
              g.id === id
                ? { ...g, archived: true, archivedAt: new Date().toISOString() }
                : g,
            ),
          }));
          log({
            entity: "guest",
            entityId: id,
            action: "archive",
            description: `Guest "${guest.name}" archived`,
          });
          return { ok: true };
        },
        restoreGuest: (id) => {
          const guest = get().guests.find((g) => g.id === id);
          if (!guest) return;
          set((s) => ({
            guests: s.guests.map((g) =>
              g.id === id ? { ...g, archived: false, archivedAt: undefined } : g,
            ),
          }));
          log({
            entity: "guest",
            entityId: id,
            action: "restore",
            description: `Guest "${guest.name}" restored`,
          });
        },

        // -------------------- Reservations --------------------
        hasRoomConflict: (roomId, checkIn, checkOut, ignoreReservationId) => {
          const startA = new Date(checkIn).getTime();
          const endA = new Date(checkOut).getTime();
          return (
            get().reservations.find((r) => {
              if (r.id === ignoreReservationId) return false;
              if (r.roomId !== roomId) return false;
              if (r.status === "cancelled" || r.status === "checked-out") return false;
              const startB = new Date(r.checkIn).getTime();
              const endB = new Date(r.checkOut).getTime();
              return startA < endB && endA > startB;
            }) ?? null
          );
        },

        addReservation: (r) => {
          const startA = new Date(r.checkIn).getTime();
          const endA = new Date(r.checkOut).getTime();
          if (!(endA > startA)) {
            return { ok: false as const, error: "Check-out must be after check-in." };
          }
          const room = get().rooms.find((rm) => rm.id === r.roomId);
          if (!room || room.archived) {
            return { ok: false as const, error: "Room is not available." };
          }
          const conflict = get().hasRoomConflict(r.roomId, r.checkIn, r.checkOut);
          if (conflict) {
            return {
              ok: false as const,
              error: `Room is already booked from ${conflict.checkIn} to ${conflict.checkOut}.`,
            };
          }
          const id = uid();
          const newReservation: Reservation = {
            ...r,
            id,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({ reservations: [...s.reservations, newReservation] }));
          const guest = get().guests.find((g) => g.id === r.guestId);
          log({
            entity: "reservation",
            entityId: id,
            action: "create",
            description: `Reservation for ${guest?.name ?? "guest"} · Room ${room.number} · ${r.checkIn} → ${r.checkOut}`,
            metadata: { roomId: r.roomId, guestId: r.guestId, total: r.totalAmount },
          });
          return { ok: true as const, id };
        },

        checkIn: (id) => {
          const res = get().reservations.find((r) => r.id === id);
          if (!res || res.status !== "confirmed") return;
          const now = new Date().toISOString();
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id
                ? { ...r, status: "checked-in" as ReservationStatus, checkedInAt: now }
                : r,
            ),
            rooms: s.rooms.map((rm) =>
              rm.id === res.roomId ? { ...rm, status: "occupied" as RoomStatus } : rm,
            ),
          }));
          const guest = get().guests.find((g) => g.id === res.guestId);
          const room = get().rooms.find((rm) => rm.id === res.roomId);
          log({
            entity: "reservation",
            entityId: id,
            action: "check-in",
            description: `Check-in: ${guest?.name ?? "guest"} → Room ${room?.number ?? "?"}`,
            metadata: { at: now },
          });
        },

        checkOut: (id) => {
          const res = get().reservations.find((r) => r.id === id);
          if (!res || res.status !== "checked-in") return;
          const now = new Date().toISOString();
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id
                ? { ...r, status: "checked-out" as ReservationStatus, checkedOutAt: now }
                : r,
            ),
            rooms: s.rooms.map((rm) =>
              rm.id === res.roomId ? { ...rm, status: "cleaning" as RoomStatus } : rm,
            ),
          }));
          const guest = get().guests.find((g) => g.id === res.guestId);
          const room = get().rooms.find((rm) => rm.id === res.roomId);
          log({
            entity: "reservation",
            entityId: id,
            action: "check-out",
            description: `Check-out: ${guest?.name ?? "guest"} ← Room ${room?.number ?? "?"}`,
            metadata: { at: now },
          });
        },

        cancelReservation: (id) => {
          const res = get().reservations.find((r) => r.id === id);
          if (!res || res.status === "cancelled" || res.status === "checked-out") return;
          const now = new Date().toISOString();
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id
                ? { ...r, status: "cancelled" as ReservationStatus, cancelledAt: now }
                : r,
            ),
          }));
          const guest = get().guests.find((g) => g.id === res.guestId);
          log({
            entity: "reservation",
            entityId: id,
            action: "cancel",
            description: `Reservation cancelled · ${guest?.name ?? "guest"}`,
            metadata: { at: now },
          });
        },

        // -------------------- Payments --------------------
        addPayment: (p) => {
          const id = uid();
          set((s) => ({ payments: [...s.payments, { ...p, id }] }));
          log({
            entity: "payment",
            entityId: id,
            action: "create",
            description: `Payment $${p.amount} (${p.method}) · ${p.status}`,
            metadata: { reservationId: p.reservationId },
          });
          return id;
        },
        updatePaymentStatus: (id, status) => {
          const p = get().payments.find((x) => x.id === id);
          if (!p || p.status === status) return;
          set((s) => ({
            payments: s.payments.map((x) => (x.id === id ? { ...x, status } : x)),
          }));
          log({
            entity: "payment",
            entityId: id,
            action: "status-change",
            description: `Payment $${p.amount}: ${p.status} → ${status}`,
            metadata: { from: p.status, to: status },
          });
        },

        // -------------------- Settings --------------------
        updateSettings: (patch) => {
          set((state) => ({ settings: { ...state.settings, ...patch } }));
          log({
            entity: "settings",
            entityId: "settings",
            action: "update",
            description: `Settings updated: ${Object.keys(patch).join(", ")}`,
            metadata: patch as Record<string, unknown>,
          });
        },

        // -------------------- Audit --------------------
        clearAuditLog: () => set({ auditLog: [] }),
      };
    },
    {
      name: "nexora-os-hotel-v1",
      version: 1,
      storage: safeStorage,
      // Persist everything (including audit log) so no data is lost on reload.
    },
  ),
);

// Derived selectors / helpers
export const todayISO = () => new Date().toISOString().slice(0, 10);
