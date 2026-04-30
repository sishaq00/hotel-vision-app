import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";
export type HousekeepingStatus = "clean" | "dirty" | "inspected" | "out-of-order";
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
  // v3: housekeeping & categorization
  housekeepingStatus?: HousekeepingStatus;
  smokingAllowed?: boolean;
  accessible?: boolean;
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

export type ReservationSource = "walk-in" | "phone" | "group" | "direct";

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
  // v3 fields (no online sources)
  source?: ReservationSource;
  noShow?: boolean;
  groupMasterId?: string;
  confirmationNumber?: string;
  recentlyViewedAt?: string;
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
  // v3
  doNotRent?: boolean;
  vip?: boolean;
  notes?: string;
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
  hotelCode: string;      // e.g. "DTTSH" — short code shown next to name
  currency: string;
  timezone: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxRate: number;        // 0..1 (e.g. 0.15 = 15% VAT)
  serviceFeeRate: number; // 0..1 (e.g. 0.10 = 10% service)
  invoicePrefix: string;  // e.g. "INV"
  invoiceCounter: number; // monotonically increasing
  language: "en" | "ar";
}

// ---- v3 entities -----------------------------------------------------------

export type ShiftStatus = "open" | "closed";

export interface Shift {
  id: string;
  userId: string;          // free-form for now (pre-auth)
  userName: string;
  startedAt: string;
  endedAt?: string;
  openingCash: number;
  closingCash?: number;
  status: ShiftStatus;
  notes?: string;
}

export type ReminderPriority = "low" | "medium" | "high";

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueAt: string;
  priority: ReminderPriority;
  done: boolean;
  createdAt: string;
}

export type AdvanceDepositStatus = "held" | "applied" | "refunded";

export interface AdvanceDeposit {
  id: string;
  reservationId?: string;
  guestId: string;
  amount: number;
  method: PaymentMethod;
  status: AdvanceDepositStatus;
  receivedAt: string;
  appliedAt?: string;
  notes?: string;
}

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in-progress" | "resolved";

export interface MaintenanceTicket {
  id: string;
  roomId?: string;
  area: string;            // e.g. "Lobby", "Room 204"
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedAt: string;
  resolvedAt?: string;
  assignee?: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  status: "pending" | "in-progress" | "done";
  assignee?: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface LostFoundItem {
  id: string;
  description: string;
  foundAt: string;
  location: string;
  status: "stored" | "claimed" | "discarded";
  claimedBy?: string;
  claimedAt?: string;
}

export interface GroupMaster {
  id: string;
  name: string;            // e.g. "ACME Conference 2026"
  contactName?: string;
  contactPhone?: string;
  arrivalDate: string;
  departureDate: string;
  rateOverride?: number;   // unified nightly rate
  notes?: string;
  createdAt: string;
}

export interface Folio {
  id: string;
  reservationId?: string;
  guestId: string;
  status: "open" | "closed";
  charges: FolioCharge[];
  createdAt: string;
  closedAt?: string;
}

export interface FolioCharge {
  id: string;
  description: string;
  amount: number;
  postedAt: string;
  category: "room" | "minibar" | "spa" | "restaurant" | "laundry" | "other";
}

export interface HouseAccount {
  id: string;
  name: string;            // e.g. "Staff Meals", "Owner", "Promo"
  balance: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "linen" | "amenity" | "cleaning" | "other";
  quantity: number;
  reorderLevel: number;
  unit: string;            // e.g. "pcs", "L"
}

export interface ProductItem {
  id: string;
  name: string;
  category: "minibar" | "spa" | "restaurant" | "other";
  price: number;
  stock: number;
}

export interface RoutingRule {
  id: string;
  name: string;
  fromGuestId?: string;
  toFolioId: string;
  categories: FolioCharge["category"][];
  active: boolean;
}

export type ReportRunStatus = "queued" | "completed" | "failed";

export interface ReportRun {
  id: string;
  reportKey: string;     // e.g. "arrivals", "revenue-summary"
  reportName: string;
  format: "csv" | "pdf" | "json";
  ranAt: string;
  status: ReportRunStatus;
  rowCount?: number;
  notes?: string;
}

// ---- Audit log -------------------------------------------------------------

export type AuditEntity =
  | "room"
  | "reservation"
  | "guest"
  | "payment"
  | "settings"
  | "room-type"
  | "shift"
  | "reminder"
  | "deposit"
  | "maintenance"
  | "housekeeping"
  | "lost-found"
  | "group"
  | "folio"
  | "house-account"
  | "inventory"
  | "product"
  | "routing"
  | "report";

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

  // v3 collections
  shifts: Shift[];
  reminders: Reminder[];
  advanceDeposits: AdvanceDeposit[];
  maintenanceTickets: MaintenanceTicket[];
  housekeepingTasks: HousekeepingTask[];
  lostFoundItems: LostFoundItem[];
  groupMasters: GroupMaster[];
  folios: Folio[];
  houseAccounts: HouseAccount[];
  inventoryItems: InventoryItem[];
  productItems: ProductItem[];
  routingRules: RoutingRule[];
  reportRuns: ReportRun[];

  // Rooms
  addRoom: (room: Omit<Room, "id">) => string;
  updateRoomStatus: (id: string, status: RoomStatus) => void;
  updateRoomHousekeeping: (id: string, status: HousekeepingStatus) => void;
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
  markNoShow: (id: string) => void;
  markRecentlyViewed: (id: string) => void;
  previewInvoice: (reservationId: string) => InvoiceSnapshot | null;

  // Payments
  addPayment: (p: Omit<Payment, "id">) => string;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;

  // Shifts
  startShift: (userName: string, openingCash?: number) => string;
  endShift: (id: string, closingCash?: number, notes?: string) => void;
  getOpenShift: (userName?: string) => Shift | undefined;

  // Reminders
  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "done">) => string;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;

  // Advance Deposits
  addAdvanceDeposit: (d: Omit<AdvanceDeposit, "id" | "receivedAt" | "status">) => string;
  applyAdvanceDeposit: (id: string) => void;
  refundAdvanceDeposit: (id: string) => void;

  // Maintenance
  addMaintenanceTicket: (t: Omit<MaintenanceTicket, "id" | "reportedAt" | "status">) => string;
  updateMaintenanceStatus: (id: string, status: MaintenanceStatus) => void;

  // Housekeeping tasks
  addHousekeepingTask: (t: Omit<HousekeepingTask, "id" | "createdAt" | "status">) => string;
  updateHousekeepingTaskStatus: (id: string, status: HousekeepingTask["status"]) => void;

  // Lost & Found
  addLostFoundItem: (i: Omit<LostFoundItem, "id" | "foundAt" | "status">) => string;
  updateLostFoundStatus: (id: string, status: LostFoundItem["status"], claimedBy?: string) => void;

  // Group Master
  addGroupMaster: (g: Omit<GroupMaster, "id" | "createdAt">) => string;

  // Folios
  addFolio: (f: Omit<Folio, "id" | "createdAt" | "status" | "charges">) => string;
  postFolioCharge: (folioId: string, c: Omit<FolioCharge, "id" | "postedAt">) => void;
  closeFolio: (id: string) => void;

  // House Accounts
  addHouseAccount: (h: Omit<HouseAccount, "id" | "createdAt" | "balance">) => string;

  // Inventory
  addInventoryItem: (i: Omit<InventoryItem, "id">) => string;
  updateInventoryQuantity: (id: string, quantity: number) => void;

  // Products
  addProductItem: (p: Omit<ProductItem, "id">) => string;
  updateProductStock: (id: string, stock: number) => void;

  // Routing
  addRoutingRule: (r: Omit<RoutingRule, "id">) => string;
  toggleRoutingRule: (id: string) => void;

  // Reports
  recordReportRun: (r: Omit<ReportRun, "id" | "ranAt">) => string;
  clearReportRuns: () => void;

  // Settings
  updateSettings: (s: Partial<HotelSettings>) => void;

  // Audit
  clearAuditLog: () => void;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---- Invoice helpers -------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

export const computeNights = (checkIn: string, checkOut: string) =>
  Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
    ),
  );

function nextInvoiceNumber(settings: HotelSettings): string {
  const n = settings.invoiceCounter + 1;
  return `${settings.invoicePrefix || "INV"}-${String(n).padStart(6, "0")}`;
}

function buildInvoice(args: {
  reservation: Reservation;
  room: Room;
  settings: HotelSettings;
  invoiceNumber: string;
  issuedAt: string;
}): InvoiceSnapshot {
  const { reservation, room, settings, invoiceNumber, issuedAt } = args;
  // Use actual stay if checked out today, otherwise planned dates
  const nights = computeNights(reservation.checkIn, reservation.checkOut);
  const ratePerNight = room.price;
  const subtotal = round2(ratePerNight * nights);
  const taxRate = Math.max(0, settings.taxRate ?? 0);
  const serviceFeeRate = Math.max(0, settings.serviceFeeRate ?? 0);
  const taxAmount = round2(subtotal * taxRate);
  const serviceFeeAmount = round2(subtotal * serviceFeeRate);
  const total = round2(subtotal + taxAmount + serviceFeeAmount);
  return {
    invoiceNumber,
    issuedAt,
    nights,
    ratePerNight,
    subtotal,
    taxRate,
    taxAmount,
    serviceFeeRate,
    serviceFeeAmount,
    total,
    currency: settings.currency || "USD",
  };
}

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
        shifts: [],
        reminders: [],
        advanceDeposits: [],
        maintenanceTickets: [],
        housekeepingTasks: [],
        lostFoundItems: [],
        groupMasters: [],
        folios: [],
        houseAccounts: [],
        inventoryItems: [],
        productItems: [],
        routingRules: [],
        reportRuns: [],
        settings: {
          hotelName: "NEXORA OS",
          hotelCode: "NXR",
          currency: "USD",
          timezone: "UTC",
          contactEmail: "",
          contactPhone: "",
          address: "",
          taxRate: 0.15,
          serviceFeeRate: 0.10,
          invoicePrefix: "INV",
          invoiceCounter: 1000,
          language: "en",
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
        updateRoomHousekeeping: (id, status) => {
          const room = get().rooms.find((r) => r.id === id);
          if (!room) return;
          const from = room.housekeepingStatus ?? "clean";
          if (from === status) return;
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.id === id ? { ...r, housekeepingStatus: status } : r,
            ),
          }));
          log({
            entity: "housekeeping",
            entityId: id,
            action: "status-change",
            description: `Room ${room.number} housekeeping: ${from} → ${status}`,
            metadata: { from, to: status },
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

        previewInvoice: (reservationId) => {
          const res = get().reservations.find((r) => r.id === reservationId);
          if (!res) return null;
          const room = get().rooms.find((rm) => rm.id === res.roomId);
          if (!room) return null;
          const settings = get().settings;
          // Re-use existing snapshot if already checked-out
          if (res.invoice) return res.invoice;
          return buildInvoice({
            reservation: res,
            room,
            settings,
            invoiceNumber: nextInvoiceNumber(settings),
            issuedAt: new Date().toISOString(),
          });
        },

        checkOut: (id, opts) => {
          const res = get().reservations.find((r) => r.id === id);
          if (!res || res.status !== "checked-in") return null;
          const room = get().rooms.find((rm) => rm.id === res.roomId);
          if (!room) return null;
          const settings = get().settings;
          const now = new Date().toISOString();
          const invoiceNumber = nextInvoiceNumber(settings);
          const invoice = buildInvoice({
            reservation: res,
            room,
            settings,
            invoiceNumber,
            issuedAt: now,
          });

          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "checked-out" as ReservationStatus,
                    checkedOutAt: now,
                    totalAmount: invoice.total,
                    invoice,
                  }
                : r,
            ),
            rooms: s.rooms.map((rm) =>
              rm.id === res.roomId ? { ...rm, status: "cleaning" as RoomStatus } : rm,
            ),
            settings: { ...s.settings, invoiceCounter: s.settings.invoiceCounter + 1 },
          }));

          // Auto-record payment if requested
          if (opts?.markPaid) {
            const pid = uid();
            set((s) => ({
              payments: [
                ...s.payments,
                {
                  id: pid,
                  reservationId: id,
                  amount: invoice.total,
                  method: opts.paymentMethod ?? "card",
                  status: "paid",
                  date: now.slice(0, 10),
                },
              ],
            }));
            log({
              entity: "payment",
              entityId: pid,
              action: "create",
              description: `Auto payment $${invoice.total.toFixed(2)} on check-out (${invoice.invoiceNumber})`,
              metadata: { reservationId: id, invoiceNumber: invoice.invoiceNumber },
            });
          }

          const guest = get().guests.find((g) => g.id === res.guestId);
          log({
            entity: "reservation",
            entityId: id,
            action: "check-out",
            description: `Check-out: ${guest?.name ?? "guest"} ← Room ${room.number} · ${invoice.invoiceNumber} · $${invoice.total.toFixed(2)}`,
            metadata: { at: now, invoice },
          });
          return invoice;
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

        // -------------------- Reservation extras --------------------
        markNoShow: (id) => {
          const res = get().reservations.find((r) => r.id === id);
          if (!res || res.status !== "confirmed") return;
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id
                ? { ...r, noShow: true, status: "cancelled" as ReservationStatus, cancelledAt: new Date().toISOString() }
                : r,
            ),
          }));
          log({
            entity: "reservation",
            entityId: id,
            action: "cancel",
            description: `Marked as No-Show`,
          });
        },
        markRecentlyViewed: (id) => {
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === id ? { ...r, recentlyViewedAt: new Date().toISOString() } : r,
            ),
          }));
        },

        // -------------------- Shifts --------------------
        startShift: (userName, openingCash = 0) => {
          const id = uid();
          set((s) => ({
            shifts: [
              ...s.shifts,
              {
                id,
                userId: userName,
                userName,
                startedAt: new Date().toISOString(),
                openingCash,
                status: "open",
              },
            ],
          }));
          log({ entity: "shift", entityId: id, action: "create", description: `Shift started by ${userName}` });
          return id;
        },
        endShift: (id, closingCash, notes) => {
          const shift = get().shifts.find((x) => x.id === id);
          if (!shift || shift.status !== "open") return;
          set((s) => ({
            shifts: s.shifts.map((x) =>
              x.id === id
                ? { ...x, endedAt: new Date().toISOString(), closingCash, notes, status: "closed" as ShiftStatus }
                : x,
            ),
          }));
          log({ entity: "shift", entityId: id, action: "update", description: `Shift ended by ${shift.userName}` });
        },
        getOpenShift: (userName) => {
          return get().shifts.find(
            (s) => s.status === "open" && (!userName || s.userName === userName),
          );
        },

        // -------------------- Reminders --------------------
        addReminder: (r) => {
          const id = uid();
          set((s) => ({
            reminders: [
              ...s.reminders,
              { ...r, id, done: false, createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "reminder", entityId: id, action: "create", description: `Reminder: ${r.title}` });
          return id;
        },
        toggleReminder: (id) => {
          set((s) => ({
            reminders: s.reminders.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
          }));
        },
        deleteReminder: (id) => {
          set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
        },

        // -------------------- Advance Deposits --------------------
        addAdvanceDeposit: (d) => {
          const id = uid();
          set((s) => ({
            advanceDeposits: [
              ...s.advanceDeposits,
              { ...d, id, status: "held", receivedAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "deposit", entityId: id, action: "create", description: `Deposit $${d.amount} (${d.method})` });
          return id;
        },
        applyAdvanceDeposit: (id) => {
          set((s) => ({
            advanceDeposits: s.advanceDeposits.map((d) =>
              d.id === id ? { ...d, status: "applied", appliedAt: new Date().toISOString() } : d,
            ),
          }));
          log({ entity: "deposit", entityId: id, action: "update", description: `Deposit applied` });
        },
        refundAdvanceDeposit: (id) => {
          set((s) => ({
            advanceDeposits: s.advanceDeposits.map((d) =>
              d.id === id ? { ...d, status: "refunded" } : d,
            ),
          }));
          log({ entity: "deposit", entityId: id, action: "update", description: `Deposit refunded` });
        },

        // -------------------- Maintenance --------------------
        addMaintenanceTicket: (t) => {
          const id = uid();
          set((s) => ({
            maintenanceTickets: [
              ...s.maintenanceTickets,
              { ...t, id, status: "open", reportedAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "maintenance", entityId: id, action: "create", description: `Maintenance: ${t.area} — ${t.description}` });
          return id;
        },
        updateMaintenanceStatus: (id, status) => {
          set((s) => ({
            maintenanceTickets: s.maintenanceTickets.map((t) =>
              t.id === id
                ? { ...t, status, resolvedAt: status === "resolved" ? new Date().toISOString() : t.resolvedAt }
                : t,
            ),
          }));
          log({ entity: "maintenance", entityId: id, action: "status-change", description: `Maintenance → ${status}` });
        },

        // -------------------- Housekeeping tasks --------------------
        addHousekeepingTask: (t) => {
          const id = uid();
          set((s) => ({
            housekeepingTasks: [
              ...s.housekeepingTasks,
              { ...t, id, status: "pending", createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "housekeeping", entityId: id, action: "create", description: `HK task created` });
          return id;
        },
        updateHousekeepingTaskStatus: (id, status) => {
          set((s) => ({
            housekeepingTasks: s.housekeepingTasks.map((t) =>
              t.id === id
                ? { ...t, status, completedAt: status === "done" ? new Date().toISOString() : t.completedAt }
                : t,
            ),
          }));
        },

        // -------------------- Lost & Found --------------------
        addLostFoundItem: (i) => {
          const id = uid();
          set((s) => ({
            lostFoundItems: [
              ...s.lostFoundItems,
              { ...i, id, status: "stored", foundAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "lost-found", entityId: id, action: "create", description: `Found: ${i.description}` });
          return id;
        },
        updateLostFoundStatus: (id, status, claimedBy) => {
          set((s) => ({
            lostFoundItems: s.lostFoundItems.map((i) =>
              i.id === id
                ? { ...i, status, claimedBy, claimedAt: status === "claimed" ? new Date().toISOString() : i.claimedAt }
                : i,
            ),
          }));
        },

        // -------------------- Group Master --------------------
        addGroupMaster: (g) => {
          const id = uid();
          set((s) => ({
            groupMasters: [
              ...s.groupMasters,
              { ...g, id, createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "group", entityId: id, action: "create", description: `Group: ${g.name}` });
          return id;
        },

        // -------------------- Folios --------------------
        addFolio: (f) => {
          const id = uid();
          set((s) => ({
            folios: [
              ...s.folios,
              { ...f, id, status: "open", charges: [], createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "folio", entityId: id, action: "create", description: `Folio opened` });
          return id;
        },
        postFolioCharge: (folioId, c) => {
          set((s) => ({
            folios: s.folios.map((f) =>
              f.id === folioId
                ? {
                    ...f,
                    charges: [
                      ...f.charges,
                      { ...c, id: uid(), postedAt: new Date().toISOString() },
                    ],
                  }
                : f,
            ),
          }));
          log({ entity: "folio", entityId: folioId, action: "update", description: `Posted $${c.amount} (${c.category})` });
        },
        closeFolio: (id) => {
          set((s) => ({
            folios: s.folios.map((f) =>
              f.id === id ? { ...f, status: "closed", closedAt: new Date().toISOString() } : f,
            ),
          }));
          log({ entity: "folio", entityId: id, action: "update", description: `Folio closed` });
        },

        // -------------------- House Accounts --------------------
        addHouseAccount: (h) => {
          const id = uid();
          set((s) => ({
            houseAccounts: [
              ...s.houseAccounts,
              { ...h, id, balance: 0, createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "house-account", entityId: id, action: "create", description: `House account: ${h.name}` });
          return id;
        },

        // -------------------- Inventory --------------------
        addInventoryItem: (i) => {
          const id = uid();
          set((s) => ({ inventoryItems: [...s.inventoryItems, { ...i, id }] }));
          log({ entity: "inventory", entityId: id, action: "create", description: `Inventory: ${i.name}` });
          return id;
        },
        updateInventoryQuantity: (id, quantity) => {
          set((s) => ({
            inventoryItems: s.inventoryItems.map((i) =>
              i.id === id ? { ...i, quantity } : i,
            ),
          }));
        },

        // -------------------- Products --------------------
        addProductItem: (p) => {
          const id = uid();
          set((s) => ({ productItems: [...s.productItems, { ...p, id }] }));
          log({ entity: "product", entityId: id, action: "create", description: `Product: ${p.name}` });
          return id;
        },
        updateProductStock: (id, stock) => {
          set((s) => ({
            productItems: s.productItems.map((p) =>
              p.id === id ? { ...p, stock } : p,
            ),
          }));
        },

        // -------------------- Routing rules --------------------
        addRoutingRule: (r) => {
          const id = uid();
          set((s) => ({ routingRules: [...s.routingRules, { ...r, id }] }));
          log({ entity: "routing", entityId: id, action: "create", description: `Routing rule: ${r.name}` });
          return id;
        },
        toggleRoutingRule: (id) => {
          set((s) => ({
            routingRules: s.routingRules.map((r) =>
              r.id === id ? { ...r, active: !r.active } : r,
            ),
          }));
        },

        // -------------------- Reports --------------------
        recordReportRun: (r) => {
          const id = uid();
          set((s) => ({
            reportRuns: [
              { ...r, id, ranAt: new Date().toISOString() },
              ...s.reportRuns,
            ].slice(0, 200),
          }));
          log({
            entity: "report",
            entityId: id,
            action: "create",
            description: `Report run: ${r.reportName} (${r.format}${r.rowCount != null ? ` · ${r.rowCount} rows` : ""})`,
          });
          return id;
        },
        clearReportRuns: () => set({ reportRuns: [] }),

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
      version: 3,
      storage: safeStorage,
      // Persist everything (including audit log) so no data is lost on reload.
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<HotelState> & { settings?: Partial<HotelSettings> };
        // v1 → v2: ensure billing settings exist
        if (version < 2) {
          state.settings = {
            hotelName: "NEXORA OS",
            hotelCode: "NXR",
            currency: "USD",
            timezone: "UTC",
            contactEmail: "",
            contactPhone: "",
            address: "",
            taxRate: 0.15,
            serviceFeeRate: 0.10,
            invoicePrefix: "INV",
            invoiceCounter: 1000,
            language: "en",
            ...(state.settings ?? {}),
          } as HotelSettings;
        }
        // v2 → v3: ensure new settings fields + new collections
        if (version < 3) {
          state.settings = {
            hotelName: "NEXORA OS",
            hotelCode: "NXR",
            currency: "USD",
            timezone: "UTC",
            contactEmail: "",
            contactPhone: "",
            address: "",
            taxRate: 0.15,
            serviceFeeRate: 0.10,
            invoicePrefix: "INV",
            invoiceCounter: 1000,
            language: "en",
            ...(state.settings ?? {}),
          } as HotelSettings;
          state.shifts ??= [];
          state.reminders ??= [];
          state.advanceDeposits ??= [];
          state.maintenanceTickets ??= [];
          state.housekeepingTasks ??= [];
          state.lostFoundItems ??= [];
          state.groupMasters ??= [];
          state.folios ??= [];
          state.houseAccounts ??= [];
          state.inventoryItems ??= [];
          state.productItems ??= [];
          state.routingRules ??= [];
        }
        return state as HotelState;
      },
    },
  ),
);

// Derived selectors / helpers
export const todayISO = () => new Date().toISOString().slice(0, 10);
