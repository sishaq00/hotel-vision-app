// Cloud sync layer: keeps the local Zustand hotel-store in sync with Supabase.
//
// Strategy:
//   1. On login: pullAll() loads guests/rooms/reservations from the cloud
//      and replaces the local arrays (cloud is source of truth).
//   2. After pull: startSync() subscribes to store changes; on every mutation,
//      it diffs vs the previous snapshot and pushes upserts/deletes.
//   3. Sync is suspended while we apply remote data (avoids feedback loops).
//
// Scope: guests + rooms + reservations only. Other domains stay local for now.
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | undefined | null): s is string =>
  !!s && UUID_RE.test(s);

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
    assigned_housekeeper_id: isUuid(r.assignedHousekeeperId)
      ? r.assignedHousekeeperId
      : null,
    assigned_at: r.assignedAt ?? null,
    assigned_by: isUuid(r.assignedBy) ? r.assignedBy : null,
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
    group_master_id: isUuid(r.groupMasterId) ? r.groupMasterId : null,
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

// ---------- Pull from cloud (initial hydrate) -------------------------------

export async function pullFromCloud(): Promise<{ ok: boolean; error?: string }> {
  try {
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

    // If cloud is empty but local has data → push local up (one-time seeding).
    const local = useHotelStore.getState();
    const cloudEmpty =
      guests.length === 0 && rooms.length === 0 && reservations.length === 0;
    const localHasData =
      local.guests.length > 0 ||
      local.rooms.length > 0 ||
      local.reservations.length > 0;

    if (cloudEmpty && localHasData) {
      await pushLocalToCloud();
      return { ok: true };
    }

    // Otherwise: replace local with cloud (suspend sync to avoid feedback).
    suspended = true;
    useHotelStore.setState({ guests, rooms, reservations });
    suspended = false;
    return { ok: true };
  } catch (e: any) {
    suspended = false;
    console.error("[cloud-sync] pull failed:", e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function pushLocalToCloud() {
  const { guests, rooms, reservations } = useHotelStore.getState();
  const validGuests = guests.filter((g) => isUuid(g.id));
  const validRooms = rooms.filter((r) => isUuid(r.id));
  const validReservations = reservations.filter(
    (r) => isUuid(r.id) && isUuid(r.guestId) && isUuid(r.roomId),
  );
  if (validGuests.length)
    await supabase.from("guests").upsert(validGuests.map(guestToRow));
  if (validRooms.length)
    await supabase.from("rooms").upsert(validRooms.map(roomToRow));
  if (validReservations.length)
    await supabase
      .from("reservations")
      .upsert(validReservations.map(reservationToRow));
}

// ---------- Diff + push (per-mutation) --------------------------------------

type Indexed<T> = Map<string, T>;
const indexBy = <T extends { id: string }>(arr: T[]): Indexed<T> => {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
};

async function syncGuests(prev: Guest[], next: Guest[]) {
  const a = indexBy(prev);
  const b = indexBy(next);
  const upserts: Guest[] = [];
  const deletes: string[] = [];
  for (const g of next) {
    const old = a.get(g.id);
    if (!old || old !== g) upserts.push(g);
  }
  for (const id of a.keys()) if (!b.has(id)) deletes.push(id);
  const valid = upserts.filter((g) => isUuid(g.id));
  if (valid.length) {
    const { error } = await supabase
      .from("guests")
      .upsert(valid.map(guestToRow));
    if (error) console.error("[cloud-sync] guests upsert:", error.message);
  }
  const validDel = deletes.filter(isUuid);
  if (validDel.length) {
    const { error } = await supabase.from("guests").delete().in("id", validDel);
    if (error) console.error("[cloud-sync] guests delete:", error.message);
  }
}

async function syncRooms(prev: Room[], next: Room[]) {
  const a = indexBy(prev);
  const b = indexBy(next);
  const upserts: Room[] = [];
  const deletes: string[] = [];
  for (const r of next) {
    const old = a.get(r.id);
    if (!old || old !== r) upserts.push(r);
  }
  for (const id of a.keys()) if (!b.has(id)) deletes.push(id);
  const valid = upserts.filter((r) => isUuid(r.id));
  if (valid.length) {
    const { error } = await supabase
      .from("rooms")
      .upsert(valid.map(roomToRow));
    if (error) console.error("[cloud-sync] rooms upsert:", error.message);
  }
  const validDel = deletes.filter(isUuid);
  if (validDel.length) {
    const { error } = await supabase.from("rooms").delete().in("id", validDel);
    if (error) console.error("[cloud-sync] rooms delete:", error.message);
  }
}

async function syncReservations(prev: Reservation[], next: Reservation[]) {
  const a = indexBy(prev);
  const b = indexBy(next);
  const upserts: Reservation[] = [];
  const deletes: string[] = [];
  for (const r of next) {
    const old = a.get(r.id);
    if (!old || old !== r) upserts.push(r);
  }
  for (const id of a.keys()) if (!b.has(id)) deletes.push(id);
  const valid = upserts.filter(
    (r) => isUuid(r.id) && isUuid(r.guestId) && isUuid(r.roomId),
  );
  if (valid.length) {
    const { error } = await supabase
      .from("reservations")
      .upsert(valid.map(reservationToRow));
    if (error)
      console.error("[cloud-sync] reservations upsert:", error.message);
  }
  const validDel = deletes.filter(isUuid);
  if (validDel.length) {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .in("id", validDel);
    if (error)
      console.error("[cloud-sync] reservations delete:", error.message);
  }
}

// ---------- Public: start / stop -------------------------------------------

export function startCloudSync() {
  if (started) return;
  started = true;
  let prev = useHotelStore.getState();
  unsubscribe = useHotelStore.subscribe((state) => {
    if (suspended) {
      prev = state;
      return;
    }
    const prevSnap = prev;
    prev = state;
    if (prevSnap.guests !== state.guests) {
      void syncGuests(prevSnap.guests, state.guests);
    }
    if (prevSnap.rooms !== state.rooms) {
      void syncRooms(prevSnap.rooms, state.rooms);
    }
    if (prevSnap.reservations !== state.reservations) {
      void syncReservations(prevSnap.reservations, state.reservations);
    }
  });
}

export function stopCloudSync() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  started = false;
}
