// Cloud sync layer: keeps the local Zustand hotel-store in sync with Supabase.
//
// Strategy:
//   1. On login: pullFromCloud() loads all collections from the cloud and
//      replaces local arrays (cloud is source of truth).
//   2. After pull: startCloudSync() subscribes to store changes; on every
//      mutation, it diffs vs the previous snapshot and pushes upserts/deletes.
//   3. Sync is suspended while we apply remote data (avoids feedback loops).
//
// Design notes:
//   - Guests / rooms / reservations have full column mapping (queried directly).
//   - Other domains use a hybrid: a few required scalar columns + an `extra`
//     (or `meta`) JSONB column carrying the rest of the local object.
//     This lets us persist the entire app without 600 lines of per-field
//     mapping while keeping rows queryable.
import { supabase } from "@/integrations/supabase/client";
import {
  useHotelStore,
  type Guest,
  type Room,
  type Reservation,
} from "@/store/hotel-store";

// ---------- Sync state ------------------------------------------------------

let suspended = false;
let started = false;
let unsubscribe: (() => void) | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let pullDebounce: ReturnType<typeof setTimeout> | null = null;

function scheduleRemotePull() {
  if (pullDebounce) clearTimeout(pullDebounce);
  pullDebounce = setTimeout(() => {
    void pullFromCloud();
  }, 600);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | undefined | null): s is string =>
  !!s && UUID_RE.test(s);
const uuidOrNull = (s: string | undefined | null): string | null =>
  isUuid(s) ? s : null;

// ---------- Mapping: Guest --------------------------------------------------

function guestToRow(g: Guest) {
  return {
    id: g.id,
    name: g.name,
    email: g.email || null,
    phone: g.phone || null,
    country: g.country || null,
    created_at: g.createdAt,
    archived: !!g.archived,
    archived_at: g.archivedAt ?? null,
    do_not_rent: !!g.doNotRent,
    vip: !!g.vip,
    notes: g.notes ?? null,
    nationality: g.nationality ?? null,
    date_of_birth: g.dateOfBirth ?? null,
    gender: g.gender ?? null,
    address: g.address ?? null,
    city: g.city ?? null,
    id_type: g.idType ?? null,
    id_number: g.idNumber ?? null,
    preferences: g.preferences ?? {},
    extra: {
      postalCode: g.postalCode,
      idIssuedBy: g.idIssuedBy,
      idExpiry: g.idExpiry,
      idPhotoDataUrl: g.idPhotoDataUrl,
      profilePhotoDataUrl: g.profilePhotoDataUrl,
      tags: g.tags,
      company: g.company,
      loyaltyNumber: g.loyaltyNumber,
      documents: g.documents ?? [],
    },

  };
}

function rowToGuest(r: any): Guest {
  const x = r.extra ?? {};
  return {
    id: r.id,
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    country: r.country ?? "",
    createdAt: r.created_at,
    archived: !!r.archived,
    archivedAt: r.archived_at ?? undefined,
    doNotRent: !!r.do_not_rent,
    vip: !!r.vip,
    notes: r.notes ?? undefined,
    nationality: r.nationality ?? undefined,
    dateOfBirth: r.date_of_birth ?? undefined,
    gender: r.gender ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    idType: r.id_type ?? undefined,
    idNumber: r.id_number ?? undefined,
    preferences: r.preferences ?? undefined,
    postalCode: x.postalCode,
    idIssuedBy: x.idIssuedBy,
    idExpiry: x.idExpiry,
    idPhotoDataUrl: x.idPhotoDataUrl,
    profilePhotoDataUrl: x.profilePhotoDataUrl,
    tags: x.tags,
    company: x.company,
    loyaltyNumber: x.loyaltyNumber,
    documents: Array.isArray(x.documents) ? x.documents : [],
  };
}


// ---------- Mapping: Room ---------------------------------------------------

function roomToRow(r: Room) {
  return {
    id: r.id,
    number: r.number,
    type: r.type,
    type_code: r.typeCode || null,
    floor: r.floor ?? 0,
    price: r.price ?? 0,
    status: r.status,
    housekeeping_status: r.housekeepingStatus ?? null,
    smoking_allowed: !!r.smokingAllowed,
    accessible: !!r.accessible,
    archived: !!r.archived,
    archived_at: r.archivedAt ?? null,
    zone: r.zone ?? null,
    building: r.building ?? null,
    bed_code: r.bedCode ?? null,
    task_type: r.taskType ?? null,
    assigned_housekeeper_id: uuidOrNull(r.assignedHousekeeperId),
    assigned_at: r.assignedAt ?? null,
    assigned_by: uuidOrNull(r.assignedBy),
    cleaning_started_at: r.cleaningStartedAt ?? null,
    cleaning_finished_at: r.cleaningFinishedAt ?? null,
    cleaning_value: r.cleaningValue ?? null,
    dnd_flag: !!r.dndFlag,
    refused_service: !!r.refusedService,
    housekeeping_notes: r.housekeepingNotes ?? null,
    housekeeping_photos: r.housekeepingPhotos ?? [],
  };
}

function rowToRoom(r: any): Room {
  return {
    id: r.id,
    number: r.number,
    type: r.type,
    typeCode: r.type_code ?? "",
    floor: r.floor ?? 0,
    price: Number(r.price ?? 0),
    status: r.status,
    housekeepingStatus: r.housekeeping_status ?? undefined,
    smokingAllowed: !!r.smoking_allowed,
    accessible: !!r.accessible,
    archived: !!r.archived,
    archivedAt: r.archived_at ?? undefined,
    zone: r.zone ?? undefined,
    building: r.building ?? undefined,
    bedCode: r.bed_code ?? undefined,
    taskType: r.task_type ?? undefined,
    assignedHousekeeperId: r.assigned_housekeeper_id ?? undefined,
    assignedAt: r.assigned_at ?? undefined,
    assignedBy: r.assigned_by ?? undefined,
    cleaningStartedAt: r.cleaning_started_at ?? undefined,
    cleaningFinishedAt: r.cleaning_finished_at ?? undefined,
    cleaningValue: r.cleaning_value ?? undefined,
    dndFlag: !!r.dnd_flag,
    refusedService: !!r.refused_service,
    housekeepingNotes: r.housekeeping_notes ?? undefined,
    housekeepingPhotos: r.housekeeping_photos ?? [],
  };
}

// ---------- Mapping: Reservation -------------------------------------------

function reservationToRow(r: Reservation) {
  return {
    id: r.id,
    guest_id: r.guestId,
    room_id: r.roomId,
    check_in: r.checkIn,
    check_out: r.checkOut,
    status: r.status,
    total_amount: r.totalAmount ?? 0,
    created_at: r.createdAt,
    checked_in_at: r.checkedInAt ?? null,
    checked_out_at: r.checkedOutAt ?? null,
    cancelled_at: r.cancelledAt ?? null,
    invoice: r.invoice ?? null,
    source: r.source ?? null,
    no_show: !!r.noShow,
    group_master_id: uuidOrNull(r.groupMasterId),
    confirmation_number: r.confirmationNumber ?? null,
    notes: r.notes ?? null,
    last_nightly_charge_date: r.lastNightlyChargeDate ?? null,
  };
}

function rowToReservation(r: any): Reservation {
  return {
    id: r.id,
    guestId: r.guest_id,
    roomId: r.room_id,
    checkIn: r.check_in,
    checkOut: r.check_out,
    status: r.status,
    totalAmount: Number(r.total_amount ?? 0),
    createdAt: r.created_at,
    checkedInAt: r.checked_in_at ?? undefined,
    checkedOutAt: r.checked_out_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    invoice: r.invoice ?? undefined,
    source: r.source ?? undefined,
    noShow: !!r.no_show,
    groupMasterId: r.group_master_id ?? undefined,
    confirmationNumber: r.confirmation_number ?? undefined,
    notes: r.notes ?? undefined,
    lastNightlyChargeDate: r.last_nightly_charge_date ?? undefined,
  };
}

// ---------- Generic hybrid mappers ------------------------------------------
// For tables where we don't need per-field queryability, we store a few
// required scalar columns + the entire local object inside `extra` JSONB.

type Mapping<T extends { id: string }> = {
  table: string;
  jsonField: "extra" | "meta";
  toRow: (item: T) => any;
  fromRow: (row: any) => T;
  valid?: (item: T) => boolean; // skip rows that can't satisfy NOT NULL/FK
};

const M = {
  payments: {
    table: "payments",
    jsonField: "meta",
    toRow: (p: any) => ({
      id: p.id,
      reservation_id: uuidOrNull(p.reservationId),
      amount: p.amount ?? 0,
      method: p.method ?? "cash",
      status: p.status ?? "paid",
      notes: p.notes ?? null,
      meta: p,
    }),
    fromRow: (r: any) => r.meta ?? { id: r.id, reservationId: r.reservation_id, amount: r.amount, method: r.method, status: r.status },
  } as Mapping<any>,

  advanceDeposits: {
    table: "advance_deposits",
    jsonField: "extra" as const,
    toRow: (d: any) => ({
      id: d.id,
      reservation_id: uuidOrNull(d.reservationId),
      guest_id: uuidOrNull(d.guestId),
      amount: d.amount ?? 0,
      status: d.status ?? "held",
      notes: d.notes ?? null,
      extra: d,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, amount: r.amount, status: r.status },
  } as Mapping<any>,

  shifts: {
    table: "shifts",
    jsonField: "extra" as const,
    toRow: (s: any) => ({
      id: s.id,
      status: s.status ?? "open",
      opened_at: s.startedAt ?? new Date().toISOString(),
      closed_at: s.endedAt ?? null,
      opening_balance: s.openingCash ?? 0,
      closing_balance: s.closingCash ?? null,
      notes: s.notes ?? null,
      extra: s,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, status: r.status, startedAt: r.opened_at, endedAt: r.closed_at, openingCash: r.opening_balance, closingCash: r.closing_balance },
  } as Mapping<any>,

  reminders: {
    table: "reminders",
    jsonField: "extra" as const,
    toRow: (r: any) => ({
      id: r.id,
      title: r.title ?? "(untitled)",
      body: r.description ?? null,
      due_at: r.dueAt ?? null,
      priority: r.priority ?? "medium",
      completed: !!r.done,
    }),
    fromRow: (r: any) => ({
      id: r.id,
      title: r.title,
      description: r.body ?? undefined,
      dueAt: r.due_at,
      priority: r.priority,
      done: !!r.completed,
      createdAt: r.created_at,
    }),
  } as Mapping<any>,

  maintenanceTickets: {
    table: "maintenance_tickets",
    jsonField: "extra" as const,
    toRow: (t: any) => ({
      id: t.id,
      title: t.area ?? "Maintenance",
      description: t.description ?? null,
      priority: t.priority ?? "medium",
      status: t.status ?? "open",
      room_id: uuidOrNull(t.roomId),
      resolved_at: t.resolvedAt ?? null,
    }),
    fromRow: (r: any) => ({
      id: r.id,
      area: r.title,
      description: r.description ?? "",
      priority: r.priority,
      status: r.status,
      roomId: r.room_id ?? undefined,
      reportedAt: r.created_at,
      resolvedAt: r.resolved_at ?? undefined,
    }),
  } as Mapping<any>,

  housekeepingTasks: {
    table: "housekeeping_tasks",
    jsonField: "extra" as const,
    toRow: (t: any) => ({
      id: t.id,
      task_type: t.taskType ?? "departure",
      status: t.status ?? "pending",
      room_id: uuidOrNull(t.roomId),
      notes: t.notes ?? null,
      extra: t,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, status: r.status, roomId: r.room_id, createdAt: r.created_at },
  } as Mapping<any>,

  lostFoundItems: {
    table: "lost_found",
    jsonField: "extra" as const,
    toRow: (i: any) => ({
      id: i.id,
      description: i.description ?? "(item)",
      status: i.status === "claimed" ? "claimed" : i.status === "discarded" ? "discarded" : "storage",
      claimed_at: i.claimedAt ?? null,
      extra: i,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, description: r.description, status: r.status === "storage" ? "stored" : r.status, foundAt: r.created_at, location: "" },
  } as Mapping<any>,

  groupMasters: {
    table: "group_masters",
    jsonField: "extra" as const,
    toRow: (g: any) => ({
      id: g.id,
      name: g.name ?? "(group)",
      contact_name: g.contactName ?? null,
      contact_phone: g.contactPhone ?? null,
      notes: g.notes ?? null,
      rate: g.rateOverride ?? null,
      extra: g,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, contactName: r.contact_name, contactPhone: r.contact_phone, arrivalDate: "", departureDate: "", createdAt: r.created_at },
  } as Mapping<any>,

  folios: {
    table: "folios",
    jsonField: "extra" as const,
    toRow: (f: any) => ({
      id: f.id,
      reservation_id: uuidOrNull(f.reservationId),
      guest_id: uuidOrNull(f.guestId),
      status: f.status ?? "open",
      balance: 0,
      extra: f,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, status: r.status, charges: [], createdAt: r.created_at, guestId: r.guest_id },
  } as Mapping<any>,

  houseAccounts: {
    table: "house_accounts",
    jsonField: "extra" as const,
    toRow: (h: any) => ({
      id: h.id,
      name: h.name ?? "(account)",
      balance: h.balance ?? 0,
      notes: h.notes ?? null,
      extra: h,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, balance: Number(r.balance ?? 0), notes: r.notes, createdAt: r.created_at },
  } as Mapping<any>,

  inventoryItems: {
    table: "inventory_items",
    jsonField: "extra" as const,
    toRow: (i: any) => ({
      id: i.id,
      name: i.name ?? "(item)",
      category: i.category ?? null,
      quantity: i.quantity ?? 0,
      unit: i.unit ?? null,
      reorder_level: i.reorderLevel ?? null,
      extra: i,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, category: r.category ?? "other", quantity: Number(r.quantity ?? 0), reorderLevel: Number(r.reorder_level ?? 0), unit: r.unit ?? "pcs" },
  } as Mapping<any>,

  productItems: {
    table: "product_items",
    jsonField: "extra" as const,
    toRow: (p: any) => ({
      id: p.id,
      name: p.name ?? "(product)",
      category: p.category ?? null,
      price: p.price ?? 0,
      quantity: p.stock ?? 0,
      extra: p,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, category: r.category ?? "other", price: Number(r.price ?? 0), stock: Number(r.quantity ?? 0) },
  } as Mapping<any>,

  productSales: {
    table: "product_sales",
    jsonField: "extra" as const,
    toRow: (s: any) => ({
      id: s.id,
      product_id: uuidOrNull(s.productId),
      reservation_id: uuidOrNull(s.reservationId),
      quantity: s.quantity ?? 1,
      unit_price: s.unitPrice ?? 0,
      total: s.total ?? 0,
      extra: s,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, productId: r.product_id, productName: "", category: "other", quantity: Number(r.quantity), unitPrice: Number(r.unit_price), total: Number(r.total), soldAt: r.created_at, userId: "", userName: "" },
  } as Mapping<any>,

  routingRules: {
    table: "routing_rules",
    jsonField: "extra" as const,
    toRow: (r: any) => ({
      id: r.id,
      name: r.name ?? "(rule)",
      active: r.active ?? true,
      action: { toFolioId: r.toFolioId, fromGuestId: r.fromGuestId },
      conditions: { categories: r.categories ?? [] },
    }),
    fromRow: (r: any) => ({
      id: r.id,
      name: r.name,
      active: !!r.active,
      toFolioId: r.action?.toFolioId ?? "",
      fromGuestId: r.action?.fromGuestId,
      categories: r.conditions?.categories ?? [],
    }),
  } as Mapping<any>,

  housekeepers: {
    table: "housekeepers",
    jsonField: "extra" as const,
    toRow: (h: any) => ({
      id: h.id,
      name: h.name ?? "(staff)",
      phone: h.phone ?? null,
      source: h.source ?? "external",
      user_id: uuidOrNull(h.systemUserId),
      active: h.active ?? true,
      extra: h,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, phone: r.phone, source: r.source, systemUserId: r.user_id, active: !!r.active, capacity: 12, createdAt: r.created_at },
  } as Mapping<any>,

  housekeepingTeams: {
    table: "housekeeping_teams",
    jsonField: "extra" as const,
    toRow: (t: any) => ({
      id: t.id,
      name: t.name ?? "(team)",
      member_ids: t.memberIds ?? [],
      extra: t,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, name: r.name, memberIds: r.member_ids ?? [], createdAt: r.created_at },
  } as Mapping<any>,

  housekeeperReports: {
    table: "housekeeper_reports",
    jsonField: "extra" as const,
    toRow: (r: any) => ({
      id: r.id,
      housekeeper_id: uuidOrNull(r.housekeeperId),
      report_date: r.date ?? new Date().toISOString().slice(0, 10),
      rooms: r.rooms ?? [],
      total_value: r.totalValue ?? 0,
      notes: null,
      extra: r,
    }),
    fromRow: (r: any) => r.extra ?? { id: r.id, housekeeperId: r.housekeeper_id, housekeeperName: "", date: r.report_date, rooms: r.rooms ?? [], status: "submitted", submittedAt: r.created_at },
  } as Mapping<any>,

  creditNotes: {
    table: "credit_notes",
    jsonField: "extra" as const,
    toRow: (c: any) => ({
      id: c.id,
      number: c.number ?? "",
      reservation_id: uuidOrNull(c.reservationId),
      invoice_number: c.invoiceNumber ?? "",
      amount: c.amount ?? 0,
      reason: c.reason ?? null,
      issued_at: c.issuedAt ?? new Date().toISOString(),
      cancel_invoice: !!c.cancelInvoice,
    }),
    fromRow: (r: any) => ({
      id: r.id,
      number: r.number,
      reservationId: r.reservation_id,
      invoiceNumber: r.invoice_number,
      amount: Number(r.amount ?? 0),
      reason: r.reason ?? "",
      issuedAt: r.issued_at,
      issuedBy: r.issued_by ?? undefined,
      cancelInvoice: !!r.cancel_invoice,
    }),
    valid: (c: any) => isUuid(c.reservationId),
  } as Mapping<any>,

  auditLog: {
    table: "audit_log",
    jsonField: "extra" as const,
    toRow: (e: any) => ({
      id: e.id,
      entity: e.entity,
      entity_id: e.entityId ? String(e.entityId) : null,
      action: e.action,
      details: { description: e.description ?? "", metadata: e.metadata ?? {} },
      created_at: e.timestamp,
    }),
    fromRow: (r: any) => ({
      id: r.id,
      timestamp: r.created_at,
      entity: r.entity,
      entityId: r.entity_id ?? "",
      action: r.action,
      description: r.details?.description ?? "",
      metadata: r.details?.metadata ?? undefined,
    }),
  } as Mapping<any>,
};

// Maps store array key → mapping
const COLLECTIONS: Record<string, Mapping<any>> = {
  payments: M.payments,
  advanceDeposits: M.advanceDeposits,
  shifts: M.shifts,
  reminders: M.reminders,
  maintenanceTickets: M.maintenanceTickets,
  housekeepingTasks: M.housekeepingTasks,
  lostFoundItems: M.lostFoundItems,
  groupMasters: M.groupMasters,
  folios: M.folios,
  houseAccounts: M.houseAccounts,
  inventoryItems: M.inventoryItems,
  productItems: M.productItems,
  productSales: M.productSales,
  routingRules: M.routingRules,
  housekeepers: M.housekeepers,
  housekeepingTeams: M.housekeepingTeams,
  housekeeperReports: M.housekeeperReports,
  creditNotes: M.creditNotes,
  auditLog: M.auditLog,
};

// ---------- Pull from cloud (initial hydrate) -------------------------------

export async function pullFromCloud(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Core 3 with full mapping
    const [guestsRes, roomsRes, reservationsRes] = await Promise.all([
      supabase.from("guests").select("*"),
      supabase.from("rooms").select("*"),
      supabase.from("reservations").select("*"),
    ]);
    if (guestsRes.error) throw guestsRes.error;
    if (roomsRes.error) throw roomsRes.error;
    if (reservationsRes.error) throw reservationsRes.error;

    const guests = (guestsRes.data ?? []).map(rowToGuest);
    const rooms = (roomsRes.data ?? []).map(rowToRoom);
    const reservations = (reservationsRes.data ?? []).map(rowToReservation);

    // Generic collections
    const generic: Record<string, any[]> = {};
    for (const [key, map] of Object.entries(COLLECTIONS)) {
      const res = await supabase.from(map.table as any).select("*");
      if (res.error) {
        console.warn(`[cloud-sync] pull ${map.table}:`, res.error.message);
        generic[key] = [];
      } else {
        generic[key] = (res.data ?? []).map(map.fromRow);
      }
    }

    // Hotel settings (single row, id=1)
    const settingsRes = await supabase
      .from("hotel_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const local = useHotelStore.getState();
    const cloudEmpty =
      guests.length === 0 &&
      rooms.length === 0 &&
      reservations.length === 0 &&
      Object.values(generic).every((a) => a.length === 0);
    const localHasData =
      local.guests.length > 0 ||
      local.rooms.length > 0 ||
      local.reservations.length > 0;

    if (cloudEmpty && localHasData) {
      await pushLocalToCloud();
      return { ok: true };
    }

    suspended = true;
    const patch: any = { guests, rooms, reservations, ...generic };
    if (settingsRes.data) {
      patch.settings = { ...local.settings, ...((settingsRes.data as any).extra ?? {}) };
    }
    useHotelStore.setState(patch);
    suspended = false;
    return { ok: true };
  } catch (e: any) {
    suspended = false;
    console.error("[cloud-sync] pull failed:", e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function pushLocalToCloud() {
  const state = useHotelStore.getState();
  const upserts: Array<PromiseLike<any>> = [];

  const vG = state.guests.filter((g) => isUuid(g.id));
  if (vG.length)
    upserts.push(supabase.from("guests").upsert(vG.map(guestToRow) as any));
  const vR = state.rooms.filter((r) => isUuid(r.id));
  if (vR.length)
    upserts.push(supabase.from("rooms").upsert(vR.map(roomToRow) as any));
  const vRes = state.reservations.filter(
    (r) => isUuid(r.id) && isUuid(r.guestId) && isUuid(r.roomId),
  );
  if (vRes.length)
    upserts.push(
      supabase.from("reservations").upsert(vRes.map(reservationToRow) as any),
    );

  for (const [key, map] of Object.entries(COLLECTIONS)) {
    const arr: any[] = (state as any)[key] ?? [];
    const valid = arr.filter(
      (x) => isUuid(x.id) && (!map.valid || map.valid(x)),
    );
    if (valid.length)
      upserts.push(
        supabase.from(map.table as any).upsert(valid.map(map.toRow) as any),
      );
  }

  // Settings (single row)
  upserts.push(
    supabase
      .from("hotel_settings")
      .upsert({ id: 1, extra: state.settings as any } as any),
  );

  await Promise.all(upserts);
}

// ---------- Diff + push (per-mutation) --------------------------------------

const indexBy = <T extends { id: string }>(arr: T[]) => {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
};

async function syncCollection<T extends { id: string }>(
  prev: T[],
  next: T[],
  table: string,
  toRow: (item: T) => any,
  valid?: (item: T) => boolean,
) {
  const a = indexBy(prev);
  const b = indexBy(next);
  const upserts: T[] = [];
  const deletes: string[] = [];
  for (const x of next) {
    const old = a.get(x.id);
    if (!old || old !== x) upserts.push(x);
  }
  for (const id of a.keys()) if (!b.has(id)) deletes.push(id);
  const v = upserts.filter((x) => isUuid(x.id) && (!valid || valid(x)));
  if (v.length) {
    const { error } = await supabase
      .from(table as any)
      .upsert(v.map(toRow) as any);
    if (error) console.error(`[cloud-sync] ${table} upsert:`, error.message);
  }
  const d = deletes.filter(isUuid);
  if (d.length) {
    const { error } = await supabase.from(table as any).delete().in("id", d);
    if (error) console.error(`[cloud-sync] ${table} delete:`, error.message);
  }
}

// ---------- Public: start / stop -------------------------------------------

export function startCloudSync() {
  if (started) return;
  started = true;
  let prev = useHotelStore.getState();

  // --- Realtime: react to remote changes by pulling fresh data ---
  if (!realtimeChannel) {
    const tables = [
      "reservations","rooms","guests","payments","housekeeping_tasks",
      "maintenance_tickets","shifts","folios","folio_charges","reminders",
      "credit_notes","advance_deposits","product_sales","audit_log",
      "house_accounts","inventory_items","product_items","lost_found",
      "group_masters","routing_rules","housekeepers","housekeeping_teams",
      "housekeeper_reports",
    ];
    const ch = supabase.channel("hotel-sync");
    for (const t of tables) {
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: t },
        () => scheduleRemotePull(),
      );
    }
    ch.subscribe();
    realtimeChannel = ch;
  }

  unsubscribe = useHotelStore.subscribe((state) => {
    if (suspended) {
      prev = state;
      return;
    }
    const p = prev;
    prev = state;

    if (p.guests !== state.guests)
      void syncCollection(
        p.guests,
        state.guests,
        "guests",
        guestToRow as any,
      );
    if (p.rooms !== state.rooms)
      void syncCollection(p.rooms, state.rooms, "rooms", roomToRow as any);
    if (p.reservations !== state.reservations)
      void syncCollection(
        p.reservations,
        state.reservations,
        "reservations",
        reservationToRow as any,
        (r: Reservation) =>
          isUuid(r.guestId) && isUuid(r.roomId),
      );

    for (const [key, m] of Object.entries(COLLECTIONS)) {
      const pa: any[] = (p as any)[key] ?? [];
      const na: any[] = (state as any)[key] ?? [];
      if (pa !== na) void syncCollection(pa, na, m.table, m.toRow, m.valid);
    }

    if (p.settings !== state.settings) {
      void supabase
        .from("hotel_settings")
        .upsert({ id: 1, extra: state.settings as any } as any)
        .then(({ error }: any) => {
          if (error)
            console.error("[cloud-sync] hotel_settings:", error.message);
        });
    }
  });
}

export function stopCloudSync() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  started = false;
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (pullDebounce) {
    clearTimeout(pullDebounce);
    pullDebounce = null;
  }
}
