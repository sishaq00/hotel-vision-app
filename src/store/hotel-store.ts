import { create } from "zustand";
import { logActivity } from "@/store/activity-store";
import { useAuthStore } from "@/store/auth-store";
import { persist, createJSONStorage } from "zustand/middleware";

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";
export type HousekeepingStatus =
  | "clean"
  | "dirty"
  | "inspected"
  | "out-of-order"
  | "departure"   // expected to depart today (post-NA classification)
  | "stayover";   // staying — needs touch-up clean
export type HousekeepingTaskType =
  | "departure"
  | "stayover"
  | "touch-up"
  | "deep-clean"
  | "inspection";
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
  // v4: assignment & cleaning lifecycle
  zone?: string;          // e.g. "North Wing"
  building?: string;      // e.g. "Main", "Annex"
  bedCode?: string;       // e.g. "K1KN", "O2ON"
  taskType?: HousekeepingTaskType;
  assignedHousekeeperId?: string;
  assignedAt?: string;
  assignedBy?: string;
  cleaningStartedAt?: string;
  cleaningFinishedAt?: string;
  cleaningValue?: number; // cost/value attached to cleaning this room (for payroll)
  dndFlag?: boolean;
  refusedService?: boolean;
  housekeepingNotes?: string;
  housekeepingPhotos?: string[]; // base64 data URLs
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

export interface CreditNote {
  id: string;
  number: string;                 // CN-YYYY-000001
  reservationId: string;
  invoiceNumber: string;          // original invoice
  amount: number;                 // positive number subtracted from invoice
  reason: string;
  issuedAt: string;
  issuedBy?: string;
  cancelInvoice?: boolean;        // if true → invoice fully cancelled
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
  notes?: string; // free-text guest requests / special instructions
}

export type GuestIdType = "passport" | "national-id" | "driver-license" | "other";

export interface GuestPreferences {
  roomType?: string;        // preferred room type code
  floor?: number;           // preferred floor
  smoking?: boolean;
  pillow?: string;          // e.g. "Soft", "Firm"
  bedType?: string;         // e.g. "King", "Twin"
  language?: string;
  other?: string;           // free-form
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
  // v5: full personal profile
  nationality?: string;
  dateOfBirth?: string;          // YYYY-MM-DD
  gender?: "male" | "female" | "other";
  address?: string;
  city?: string;
  postalCode?: string;
  idType?: GuestIdType;
  idNumber?: string;
  idIssuedBy?: string;
  idExpiry?: string;             // YYYY-MM-DD
  idPhotoDataUrl?: string;       // base64 photo of ID document
  profilePhotoDataUrl?: string;  // optional avatar
  preferences?: GuestPreferences;
  tags?: string[];               // e.g. ["VIP","Returning","Corporate"]
  company?: string;
  loyaltyNumber?: string;
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
  // Branding & invoice template (offline)
  logoDataUrl?: string;        // base64 logo for header / invoices
  taxId?: string;              // tax / VAT registration number
  invoiceFooter?: string;      // free text printed at the bottom of invoices
  invoiceNotes?: string;       // optional notes / payment terms
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

// ---- v4: Housekeeping staff & teams ---------------------------------------

export type HousekeeperSource = "system-user" | "external";

export interface Housekeeper {
  id: string;
  name: string;
  phone?: string;
  source: HousekeeperSource;
  systemUserId?: string;     // when source === 'system-user'
  active: boolean;
  capacity: number;          // max rooms / day
  hourlyRate?: number;
  color?: string;            // tailwind color hint for chip
  initials?: string;         // 2-letter chip override
  createdAt: string;
}

export interface HousekeepingTeam {
  id: string;
  name: string;
  leaderId?: string;
  memberIds: string[];
  createdAt: string;
}

export interface HousekeeperReportRoom {
  roomId: string;
  roomNumber: string;
  taskType?: HousekeepingTaskType;
  startedAt?: string;
  finishedAt: string;
  notes?: string;
  photos?: string[];
}

export interface HousekeeperReport {
  id: string;
  housekeeperId: string;
  housekeeperName: string;
  date: string;              // YYYY-MM-DD
  rooms: HousekeeperReportRoom[];
  status: "submitted" | "reviewed";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  totalValue?: number;       // sum of cleaningValue for payroll
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

export interface ProductSale {
  id: string;
  productId: string;
  productName: string;
  category: ProductItem["category"];
  quantity: number;
  unitPrice: number;
  total: number;
  roomId?: string;
  roomNumber?: string;
  reservationId?: string;
  guestName?: string;
  soldAt: string;
  userId: string;
  userName: string;
  shiftId?: string;
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
  | "report"
  | "invoice";

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
  | "price-change"
  | "credit-note";

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
  productSales: ProductSale[];
  lastNightAuditDate?: string;
  // v4 collections
  housekeepers: Housekeeper[];
  housekeepingTeams: HousekeepingTeam[];
  housekeeperReports: HousekeeperReport[];
  // v5: financial
  creditNotes: CreditNote[];

  // Credit Notes
  issueCreditNote: (input: {
    reservationId: string;
    amount: number;
    reason: string;
    cancelInvoice?: boolean;
  }) => { ok: true; id: string; number: string } | { ok: false; error: string };

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
  updateGuest: (id: string, patch: Partial<Omit<Guest, "id" | "createdAt">>) => void;
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

  // Housekeepers (staff)
  addHousekeeper: (h: Omit<Housekeeper, "id" | "createdAt">) => string;
  updateHousekeeper: (id: string, patch: Partial<Omit<Housekeeper, "id" | "createdAt">>) => void;
  deleteHousekeeper: (id: string) => void;

  // Housekeeping teams
  addHousekeepingTeam: (t: Omit<HousekeepingTeam, "id" | "createdAt">) => string;
  updateHousekeepingTeam: (id: string, patch: Partial<Omit<HousekeepingTeam, "id" | "createdAt">>) => void;
  deleteHousekeepingTeam: (id: string) => void;

  // Room assignment & cleaning lifecycle
  assignRoomsToHousekeeper: (
    roomIds: string[],
    housekeeperId: string,
    taskType?: HousekeepingTaskType,
  ) => number;
  assignRoomsToTeam: (
    roomIds: string[],
    teamId: string,
    taskType?: HousekeepingTaskType,
  ) => number;
  autoDistributeDirtyRooms: (taskType?: HousekeepingTaskType) => number;
  unassignRooms: (roomIds: string[]) => void;
  setRoomDND: (roomId: string, flag: boolean) => void;
  setRoomRefused: (roomId: string, flag: boolean) => void;
  startCleaning: (roomId: string) => void;
  finishCleaning: (roomId: string, notes?: string, photos?: string[]) => void;

  // Housekeeper reports
  submitHousekeeperReport: (housekeeperId: string) => string | null;
  reviewHousekeeperReport: (
    reportId: string,
    decisions: Array<{ roomId: string; newStatus: HousekeepingStatus }>,
  ) => void;

  // Night audit reclassify
  runNightAuditHousekeeping: () => { stayover: number; departure: number; cleared: number };

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
  recordProductSale: (input: {
    productId: string;
    quantity: number;
    roomId?: string;
    reservationId?: string;
  }) => { ok: true; sale: ProductSale } | { ok: false; error: string };

  // Reservation extend / shorten
  extendStay: (
    reservationId: string,
    newCheckOut: string,
    reason?: string,
  ) => { ok: true; nightsDelta: number; amountDelta: number } | { ok: false; error: string };

  // Night audit tracking
  setLastNightAuditDate: (date: string) => void;

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

function inferTaskType(room: Room): HousekeepingTaskType {
  switch (room.housekeepingStatus) {
    case "departure":
      return "departure";
    case "stayover":
      return "stayover";
    case "out-of-order":
      return "deep-clean";
    case "inspected":
      return "inspection";
    default:
      return "departure";
  }
}

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
        productSales: [],
        lastNightAuditDate: undefined,
        housekeepers: [],
        housekeepingTeams: [],
        housekeeperReports: [],
        creditNotes: [],
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
        updateGuest: (id, patch) => {
          const before = get().guests.find((g) => g.id === id);
          if (!before) return;
          set((s) => ({
            guests: s.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)),
          }));
          log({
            entity: "guest",
            entityId: id,
            action: "update",
            description: `Guest "${before.name}" updated`,
            metadata: { fields: Object.keys(patch) },
          });
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
          logActivity({
            action: "reservation.create",
            entityType: "reservation",
            entityId: id,
            amount: r.totalAmount,
            description: `Created reservation · ${guest?.name ?? "guest"} · Room ${room.number}`,
            details: { roomNumber: room.number, guestName: guest?.name, checkIn: r.checkIn, checkOut: r.checkOut },
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
          logActivity({
            action: "checkin",
            entityType: "reservation",
            entityId: id,
            description: `Checked in ${guest?.name ?? "guest"} → Room ${room?.number ?? "?"}`,
            details: { roomNumber: room?.number, guestName: guest?.name },
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
              rm.id === res.roomId
                ? {
                    ...rm,
                    status: "cleaning" as RoomStatus,
                    housekeepingStatus: "dirty" as HousekeepingStatus,
                    taskType: "departure" as HousekeepingTaskType,
                  }
                : rm,
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
                  method: opts.paymentMethod ?? "cash",
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
          logActivity({
            action: "checkout",
            entityType: "reservation",
            entityId: id,
            amount: invoice.total,
            description: `Checked out ${guest?.name ?? "guest"} ← Room ${room.number} · ${invoice.invoiceNumber}`,
            details: { roomNumber: room.number, guestName: guest?.name, invoiceNumber: invoice.invoiceNumber, paid: !!opts?.markPaid },
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
          logActivity({
            action: "reservation.cancel",
            entityType: "reservation",
            entityId: id,
            description: `Cancelled reservation · ${guest?.name ?? "guest"}`,
            details: { guestName: guest?.name },
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
          logActivity({
            action: "payment.record",
            entityType: "payment",
            entityId: id,
            amount: p.amount,
            description: `Recorded ${p.method} payment $${p.amount.toFixed(2)}`,
            details: { reservationId: p.reservationId, method: p.method, status: p.status },
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
          // Try to bind to current authenticated user; fall back to provided name.
          let userId = userName;
          let resolvedName = userName;
          try {
            const me = useAuthStore.getState().current();
            if (me) {
              userId = me.id;
              resolvedName = me.fullName || me.username;
            }
          } catch { /* ignore */ }

          // prevent duplicate open shift for same user
          const existing = get().shifts.find(
            (s) => s.status === "open" && s.userId === userId,
          );
          if (existing) {
            return existing.id;
          }

          const id = uid();
          set((s) => ({
            shifts: [
              ...s.shifts,
              {
                id,
                userId,
                userName: resolvedName,
                startedAt: new Date().toISOString(),
                openingCash,
                status: "open",
              },
            ],
          }));
          log({ entity: "shift", entityId: id, action: "create", description: `Shift started by ${resolvedName}` });
          logActivity({
            action: "shift.open",
            entityType: "shift",
            entityId: id,
            description: `Opened shift · opening cash ${openingCash.toFixed(2)}`,
            details: { openingCash },
          });
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
          logActivity({
            action: "shift.close",
            entityType: "shift",
            entityId: id,
            amount: closingCash,
            description: `Closed shift · closing cash ${(closingCash ?? 0).toFixed(2)}`,
            details: { closingCash, openingCash: shift.openingCash, notes },
          });
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
        recordProductSale: ({ productId, quantity, roomId, reservationId }) => {
          if (quantity <= 0) return { ok: false as const, error: "Quantity must be positive" };
          const product = get().productItems.find((p) => p.id === productId);
          if (!product) return { ok: false as const, error: "Product not found" };
          if (product.stock < quantity) return { ok: false as const, error: "Insufficient stock" };

          const me = useAuthStore.getState().current();
          if (!me) return { ok: false as const, error: "You must be signed in" };

          const room = roomId ? get().rooms.find((r) => r.id === roomId) : undefined;
          const reservation = reservationId
            ? get().reservations.find((r) => r.id === reservationId)
            : undefined;
          const guest = reservation
            ? get().guests.find((g) => g.id === reservation.guestId)
            : undefined;

          const openShift = get().shifts.find(
            (s) => s.status === "open" && s.userId === me.id,
          );

          const total = round2(product.price * quantity);
          const sale: ProductSale = {
            id: uid(),
            productId: product.id,
            productName: product.name,
            category: product.category,
            quantity,
            unitPrice: product.price,
            total,
            roomId,
            roomNumber: room?.number,
            reservationId,
            guestName: guest?.name,
            soldAt: new Date().toISOString(),
            userId: me.id,
            userName: me.fullName || me.username,
            shiftId: openShift?.id,
          };

          set((s) => ({
            productSales: [sale, ...s.productSales],
            productItems: s.productItems.map((p) =>
              p.id === productId ? { ...p, stock: p.stock - quantity } : p,
            ),
          }));

          log({
            entity: "product",
            entityId: sale.id,
            action: "create",
            description: `Sold ${quantity}× ${product.name} (${product.price.toFixed(2)} ea)${room ? ` → Room ${room.number}` : ""}`,
            metadata: { total, roomNumber: room?.number },
          });
          logActivity({
            action: "payment.record",
            entityType: "payment",
            entityId: sale.id,
            amount: total,
            description: `Sold ${quantity}× ${product.name}${room ? ` → Room ${room.number}` : ""}`,
            details: {
              productName: product.name,
              quantity,
              unitPrice: product.price,
              roomNumber: room?.number,
              guestName: guest?.name,
              kind: "product-sale",
            },
          });
          return { ok: true as const, sale };
        },

        extendStay: (reservationId, newCheckOut, reason) => {
          const res = get().reservations.find((r) => r.id === reservationId);
          if (!res) return { ok: false as const, error: "Reservation not found" };
          if (res.status === "checked-out" || res.status === "cancelled") {
            return { ok: false as const, error: "Cannot modify a closed reservation" };
          }
          const room = get().rooms.find((r) => r.id === res.roomId);
          if (!room) return { ok: false as const, error: "Room not found" };

          const oldCheckOut = res.checkOut;
          if (newCheckOut === oldCheckOut) {
            return { ok: false as const, error: "New check-out is identical" };
          }
          if (new Date(newCheckOut).getTime() <= new Date(res.checkIn).getTime()) {
            return { ok: false as const, error: "Check-out must be after check-in" };
          }

          // Conflict check (skip self)
          const conflict = get().hasRoomConflict(res.roomId, res.checkIn, newCheckOut, reservationId);
          if (conflict) {
            return { ok: false as const, error: `Room is booked from ${conflict.checkIn} to ${conflict.checkOut}` };
          }

          const oldNights = computeNights(res.checkIn, oldCheckOut);
          const newNights = computeNights(res.checkIn, newCheckOut);
          const nightsDelta = newNights - oldNights;
          const newTotal = round2(room.price * newNights);
          const amountDelta = round2(newTotal - res.totalAmount);

          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === reservationId
                ? { ...r, checkOut: newCheckOut, totalAmount: newTotal }
                : r,
            ),
          }));

          const guest = get().guests.find((g) => g.id === res.guestId);
          log({
            entity: "reservation",
            entityId: reservationId,
            action: "update",
            description: `Stay ${nightsDelta > 0 ? "extended" : "shortened"} by ${Math.abs(nightsDelta)} night(s) · Room ${room.number}`,
            metadata: { oldCheckOut, newCheckOut, nightsDelta, amountDelta, reason },
          });
          logActivity({
            action: "reservation.extend",
            entityType: "reservation",
            entityId: reservationId,
            amount: amountDelta,
            description: `${nightsDelta > 0 ? "Extended" : "Shortened"} stay by ${Math.abs(nightsDelta)} night(s) · ${guest?.name ?? "guest"} · Room ${room.number}`,
            details: {
              roomNumber: room.number,
              guestName: guest?.name,
              oldCheckOut,
              newCheckOut,
              nightsDelta,
              amountDelta,
              newTotal,
              reason,
            },
          });
          return { ok: true as const, nightsDelta, amountDelta };
        },

        setLastNightAuditDate: (date) => {
          set({ lastNightAuditDate: date });
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

        // -------------------- Housekeepers (staff) --------------------
        addHousekeeper: (h) => {
          const id = uid();
          const initials =
            h.initials ||
            h.name
              .trim()
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
          set((s) => ({
            housekeepers: [
              ...s.housekeepers,
              { ...h, id, initials, createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "housekeeping", entityId: id, action: "create", description: `Housekeeper added: ${h.name}` });
          return id;
        },
        updateHousekeeper: (id, patch) => {
          set((s) => ({
            housekeepers: s.housekeepers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
          }));
          log({ entity: "housekeeping", entityId: id, action: "update", description: `Housekeeper updated` });
        },
        deleteHousekeeper: (id) => {
          // unassign rooms first
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.assignedHousekeeperId === id
                ? { ...r, assignedHousekeeperId: undefined, assignedAt: undefined }
                : r,
            ),
            housekeepers: s.housekeepers.filter((h) => h.id !== id),
            housekeepingTeams: s.housekeepingTeams.map((t) => ({
              ...t,
              memberIds: t.memberIds.filter((m) => m !== id),
              leaderId: t.leaderId === id ? undefined : t.leaderId,
            })),
          }));
          log({ entity: "housekeeping", entityId: id, action: "archive", description: `Housekeeper removed` });
        },

        // -------------------- Housekeeping teams --------------------
        addHousekeepingTeam: (t) => {
          const id = uid();
          set((s) => ({
            housekeepingTeams: [
              ...s.housekeepingTeams,
              { ...t, id, createdAt: new Date().toISOString() },
            ],
          }));
          log({ entity: "housekeeping", entityId: id, action: "create", description: `Team added: ${t.name}` });
          return id;
        },
        updateHousekeepingTeam: (id, patch) => {
          set((s) => ({
            housekeepingTeams: s.housekeepingTeams.map((t) =>
              t.id === id ? { ...t, ...patch } : t,
            ),
          }));
        },
        deleteHousekeepingTeam: (id) => {
          set((s) => ({
            housekeepingTeams: s.housekeepingTeams.filter((t) => t.id !== id),
          }));
        },

        // -------------------- Assignment --------------------
        assignRoomsToHousekeeper: (roomIds, housekeeperId, taskType) => {
          const hk = get().housekeepers.find((h) => h.id === housekeeperId);
          if (!hk || !hk.active) return 0;
          const now = new Date().toISOString();
          const me = useAuthStore.getState().current();
          const skip: string[] = [];
          let count = 0;
          set((s) => ({
            rooms: s.rooms.map((r) => {
              if (!roomIds.includes(r.id)) return r;
              if (r.dndFlag || r.refusedService) {
                skip.push(r.number);
                return r;
              }
              count++;
              return {
                ...r,
                assignedHousekeeperId: housekeeperId,
                assignedAt: now,
                assignedBy: me?.fullName || me?.username,
                taskType: taskType ?? r.taskType ?? inferTaskType(r),
              };
            }),
          }));
          log({
            entity: "housekeeping",
            entityId: housekeeperId,
            action: "update",
            description: `Assigned ${count} room(s) to ${hk.name}${skip.length ? ` · skipped DND: ${skip.join(",")}` : ""}`,
            metadata: { count, skipped: skip },
          });
          return count;
        },

        assignRoomsToTeam: (roomIds, teamId, taskType) => {
          const team = get().housekeepingTeams.find((t) => t.id === teamId);
          if (!team) return 0;
          const members = team.memberIds
            .map((id) => get().housekeepers.find((h) => h.id === id))
            .filter((h): h is Housekeeper => !!h && h.active);
          if (members.length === 0) return 0;
          const now = new Date().toISOString();
          const me = useAuthStore.getState().current();
          let count = 0;
          let memberIdx = 0;
          set((s) => ({
            rooms: s.rooms.map((r) => {
              if (!roomIds.includes(r.id)) return r;
              if (r.dndFlag || r.refusedService) return r;
              const assignee = members[memberIdx % members.length];
              memberIdx++;
              count++;
              return {
                ...r,
                assignedHousekeeperId: assignee.id,
                assignedAt: now,
                assignedBy: me?.fullName || me?.username,
                taskType: taskType ?? r.taskType ?? inferTaskType(r),
              };
            }),
          }));
          log({
            entity: "housekeeping",
            entityId: teamId,
            action: "update",
            description: `Round-robin assigned ${count} room(s) to team "${team.name}" (${members.length} members)`,
          });
          return count;
        },

        autoDistributeDirtyRooms: (taskType) => {
          const dirty = get().rooms.filter(
            (r) =>
              !r.archived &&
              !r.assignedHousekeeperId &&
              !r.dndFlag &&
              !r.refusedService &&
              (r.housekeepingStatus === "dirty" ||
                r.housekeepingStatus === "departure" ||
                r.housekeepingStatus === "stayover"),
          );
          const active = get().housekeepers.filter((h) => h.active);
          if (active.length === 0 || dirty.length === 0) return 0;
          // weighted by remaining capacity
          const remaining = new Map<string, number>(
            active.map((h) => {
              const already = get().rooms.filter(
                (r) => r.assignedHousekeeperId === h.id,
              ).length;
              return [h.id, Math.max(0, h.capacity - already)];
            }),
          );
          const now = new Date().toISOString();
          const me = useAuthStore.getState().current();
          let assigned = 0;
          const assignments = new Map<string, string>(); // roomId -> hkId
          for (const room of dirty) {
            // pick housekeeper with most remaining capacity
            let best: Housekeeper | undefined;
            let bestRem = -1;
            for (const h of active) {
              const r = remaining.get(h.id) ?? 0;
              if (r > bestRem) {
                bestRem = r;
                best = h;
              }
            }
            if (!best || bestRem <= 0) break;
            assignments.set(room.id, best.id);
            remaining.set(best.id, (remaining.get(best.id) ?? 0) - 1);
            assigned++;
          }
          set((s) => ({
            rooms: s.rooms.map((r) => {
              const hkId = assignments.get(r.id);
              if (!hkId) return r;
              return {
                ...r,
                assignedHousekeeperId: hkId,
                assignedAt: now,
                assignedBy: me?.fullName || me?.username,
                taskType: taskType ?? r.taskType ?? inferTaskType(r),
              };
            }),
          }));
          log({
            entity: "housekeeping",
            entityId: "auto",
            action: "update",
            description: `Auto-distributed ${assigned} room(s) across ${active.length} housekeeper(s)`,
          });
          return assigned;
        },

        unassignRooms: (roomIds) => {
          set((s) => ({
            rooms: s.rooms.map((r) =>
              roomIds.includes(r.id)
                ? {
                    ...r,
                    assignedHousekeeperId: undefined,
                    assignedAt: undefined,
                    assignedBy: undefined,
                  }
                : r,
            ),
          }));
        },

        setRoomDND: (roomId, flag) => {
          set((s) => ({
            rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, dndFlag: flag } : r)),
          }));
          const room = get().rooms.find((r) => r.id === roomId);
          log({
            entity: "housekeeping",
            entityId: roomId,
            action: "update",
            description: `Room ${room?.number ?? "?"} DND ${flag ? "ON" : "OFF"}`,
          });
        },

        setRoomRefused: (roomId, flag) => {
          set((s) => ({
            rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, refusedService: flag } : r)),
          }));
        },

        startCleaning: (roomId) => {
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.id === roomId
                ? { ...r, cleaningStartedAt: new Date().toISOString(), cleaningFinishedAt: undefined }
                : r,
            ),
          }));
        },

        finishCleaning: (roomId, notes, photos) => {
          set((s) => ({
            rooms: s.rooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    cleaningFinishedAt: new Date().toISOString(),
                    housekeepingNotes: notes ?? r.housekeepingNotes,
                    housekeepingPhotos:
                      photos && photos.length ? [...(r.housekeepingPhotos ?? []), ...photos] : r.housekeepingPhotos,
                  }
                : r,
            ),
          }));
        },

        // -------------------- Housekeeper reports --------------------
        submitHousekeeperReport: (housekeeperId) => {
          const hk = get().housekeepers.find((h) => h.id === housekeeperId);
          if (!hk) return null;
          const finished = get().rooms.filter(
            (r) => r.assignedHousekeeperId === housekeeperId && r.cleaningFinishedAt,
          );
          if (finished.length === 0) return null;
          const id = uid();
          const today = new Date().toISOString().slice(0, 10);
          const totalValue = finished.reduce((sum, r) => sum + (r.cleaningValue ?? 0), 0);
          const report: HousekeeperReport = {
            id,
            housekeeperId,
            housekeeperName: hk.name,
            date: today,
            rooms: finished.map((r) => ({
              roomId: r.id,
              roomNumber: r.number,
              taskType: r.taskType,
              startedAt: r.cleaningStartedAt,
              finishedAt: r.cleaningFinishedAt!,
              notes: r.housekeepingNotes,
              photos: r.housekeepingPhotos,
            })),
            status: "submitted",
            submittedAt: new Date().toISOString(),
            totalValue,
          };
          set((s) => ({
            housekeeperReports: [report, ...s.housekeeperReports],
          }));
          log({
            entity: "housekeeping",
            entityId: id,
            action: "create",
            description: `${hk.name} submitted report (${finished.length} rooms, value $${totalValue.toFixed(2)})`,
            metadata: { count: finished.length, totalValue },
          });
          logActivity({
            action: "housekeeping.report",
            entityType: "housekeeping",
            entityId: id,
            description: `${hk.name} submitted report — ${finished.length} room(s)`,
            details: { housekeeperName: hk.name, count: finished.length, totalValue },
          });
          return id;
        },

        reviewHousekeeperReport: (reportId, decisions) => {
          const me = useAuthStore.getState().current();
          const now = new Date().toISOString();
          const decisionMap = new Map(decisions.map((d) => [d.roomId, d.newStatus]));
          set((s) => ({
            housekeeperReports: s.housekeeperReports.map((r) =>
              r.id === reportId
                ? { ...r, status: "reviewed", reviewedAt: now, reviewedBy: me?.fullName || me?.username }
                : r,
            ),
            rooms: s.rooms.map((r) => {
              const newStatus = decisionMap.get(r.id);
              if (!newStatus) return r;
              return {
                ...r,
                housekeepingStatus: newStatus,
                // clear assignment after review
                assignedHousekeeperId: undefined,
                assignedAt: undefined,
                cleaningStartedAt: undefined,
                cleaningFinishedAt: undefined,
                housekeepingNotes: undefined,
                housekeepingPhotos: undefined,
                taskType: undefined,
                status:
                  newStatus === "out-of-order"
                    ? ("maintenance" as RoomStatus)
                    : newStatus === "clean" || newStatus === "inspected"
                      ? r.status === "cleaning"
                        ? ("available" as RoomStatus)
                        : r.status
                      : r.status,
              };
            }),
          }));
          log({
            entity: "housekeeping",
            entityId: reportId,
            action: "update",
            description: `Report reviewed (${decisions.length} room decisions)`,
          });
        },

        // -------------------- Night audit reclassify --------------------
        runNightAuditHousekeeping: () => {
          const today = new Date().toISOString().slice(0, 10);
          const reservations = get().reservations;
          let stayover = 0;
          let departure = 0;
          let cleared = 0;
          set((s) => ({
            rooms: s.rooms.map((r) => {
              if (r.archived) return r;
              // clear yesterday's assignments
              const wasAssigned = !!r.assignedHousekeeperId;
              if (wasAssigned) cleared++;
              const cleaned: Partial<Room> = {
                assignedHousekeeperId: undefined,
                assignedAt: undefined,
                assignedBy: undefined,
                cleaningStartedAt: undefined,
                cleaningFinishedAt: undefined,
                housekeepingNotes: undefined,
                housekeepingPhotos: undefined,
                taskType: undefined,
              };
              const status = r.housekeepingStatus ?? "clean";
              // Only reclassify rooms that are currently clean/inspected/stayover/departure
              if (
                status === "clean" ||
                status === "inspected" ||
                status === "stayover" ||
                status === "departure"
              ) {
                const activeRes = reservations.find(
                  (res) =>
                    res.roomId === r.id &&
                    res.status === "checked-in" &&
                    res.checkIn <= today,
                );
                if (activeRes) {
                  if (activeRes.checkOut <= today) {
                    departure++;
                    return {
                      ...r,
                      ...cleaned,
                      housekeepingStatus: "departure" as HousekeepingStatus,
                      taskType: "departure" as HousekeepingTaskType,
                    };
                  } else {
                    stayover++;
                    return {
                      ...r,
                      ...cleaned,
                      housekeepingStatus: "stayover" as HousekeepingStatus,
                      taskType: "stayover" as HousekeepingTaskType,
                    };
                  }
                }
              }
              return { ...r, ...cleaned };
            }),
          }));
          log({
            entity: "housekeeping",
            entityId: "night-audit",
            action: "update",
            description: `Night audit reclassify: ${stayover} stayover, ${departure} departure, ${cleared} prior assignments cleared`,
            metadata: { stayover, departure, cleared },
          });
          return { stayover, departure, cleared };
        },

        // -------------------- Audit --------------------
        clearAuditLog: () => set({ auditLog: [] }),

        // -------------------- Credit Notes --------------------
        issueCreditNote: ({ reservationId, amount, reason, cancelInvoice }) => {
          const state = get();
          const reservation = state.reservations.find((r) => r.id === reservationId);
          if (!reservation) return { ok: false, error: "Reservation not found" };
          if (!reservation.invoice) return { ok: false, error: "No invoice on this reservation" };
          if (amount <= 0) return { ok: false, error: "Amount must be greater than zero" };
          if (amount > reservation.invoice.total + 0.01)
            return { ok: false, error: "Amount cannot exceed invoice total" };

          const year = new Date().getFullYear();
          const seq = state.creditNotes.filter((n) => n.number.includes(`-${year}-`)).length + 1;
          const number = `CN-${year}-${String(seq).padStart(6, "0")}`;
          const id = uid();
          const note: CreditNote = {
            id,
            number,
            reservationId,
            invoiceNumber: reservation.invoice.invoiceNumber,
            amount: round2(amount),
            reason: reason.trim() || "—",
            issuedAt: new Date().toISOString(),
            cancelInvoice: !!cancelInvoice,
          };
          set((s) => ({ creditNotes: [...s.creditNotes, note] }));
          log({
            entity: "invoice",
            entityId: reservationId,
            action: "credit-note",
            description: `Credit note ${number} issued (${amount.toFixed(2)}) — ${reason}`,
            metadata: { number, amount, cancelInvoice },
          });
          return { ok: true, id, number };
        },
      };
    },
    {
      name: "nexora-os-hotel-v1",
      version: 5,
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
          state.productSales ??= [];
          state.routingRules ??= [];
          state.reportRuns ??= [];
        }
        // v3 → v4: housekeeping staff & teams
        if (version < 4) {
          state.housekeepers ??= [];
          state.housekeepingTeams ??= [];
          state.housekeeperReports ??= [];
        }
        // v4 → v5: credit notes
        if (version < 5) {
          (state as Partial<HotelState>).creditNotes ??= [];
        }
        return state as HotelState;
      },
    },
  ),
);

// Derived selectors / helpers
export const todayISO = () => new Date().toISOString().slice(0, 10);
