import { create } from "zustand";

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";
export type RoomType = "Single" | "Double" | "Suite" | "Deluxe";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  floor: number;
  price: number;
  status: RoomStatus;
}

export type ReservationStatus = "confirmed" | "checked-in" | "checked-out" | "cancelled";

export interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string; // ISO date
  checkOut: string;
  status: ReservationStatus;
  totalAmount: number;
  createdAt: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  createdAt: string;
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
}

interface HotelState {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  payments: Payment[];
  settings: HotelSettings;

  // Rooms
  addRoom: (room: Omit<Room, "id">) => void;
  updateRoomStatus: (id: string, status: RoomStatus) => void;
  deleteRoom: (id: string) => void;

  // Guests
  addGuest: (guest: Omit<Guest, "id" | "createdAt">) => string;
  deleteGuest: (id: string) => void;

  // Reservations
  addReservation: (r: Omit<Reservation, "id" | "createdAt">) => { ok: true; id: string } | { ok: false; error: string };
  hasRoomConflict: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    ignoreReservationId?: string,
  ) => Reservation | null;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  cancelReservation: (id: string) => void;
  deleteReservation: (id: string) => void;

  // Payments
  addPayment: (p: Omit<Payment, "id">) => void;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;

  // Settings
  updateSettings: (s: Partial<HotelSettings>) => void;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useHotelStore = create<HotelState>((set, get) => ({
  rooms: [],
  reservations: [],
  guests: [],
  payments: [],
  settings: {
    hotelName: "NEXORA OS",
    currency: "USD",
    timezone: "UTC",
    contactEmail: "",
    contactPhone: "",
    address: "",
  },

  addRoom: (room) =>
    set((s) => ({ rooms: [...s.rooms, { ...room, id: uid() }] })),
  updateRoomStatus: (id, status) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
    })),
  deleteRoom: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),

  addGuest: (guest) => {
    const id = uid();
    set((s) => ({
      guests: [...s.guests, { ...guest, id, createdAt: new Date().toISOString() }],
    }));
    return id;
  },
  deleteGuest: (id) =>
    set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),

  hasRoomConflict: (roomId, checkIn, checkOut, ignoreReservationId) => {
    const state = useHotelStore.getState();
    const startA = new Date(checkIn).getTime();
    const endA = new Date(checkOut).getTime();
    return (
      state.reservations.find((r) => {
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
    const conflict = useHotelStore
      .getState()
      .hasRoomConflict(r.roomId, r.checkIn, r.checkOut);
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
    return { ok: true as const, id };
  },
  checkIn: (id) =>
    set((s) => {
      const res = s.reservations.find((r) => r.id === id);
      if (!res) return s;
      return {
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "checked-in" as ReservationStatus } : r,
        ),
        rooms: s.rooms.map((rm) =>
          rm.id === res.roomId ? { ...rm, status: "occupied" as RoomStatus } : rm,
        ),
      };
    }),
  checkOut: (id) =>
    set((s) => {
      const res = s.reservations.find((r) => r.id === id);
      if (!res) return s;
      return {
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "checked-out" as ReservationStatus } : r,
        ),
        rooms: s.rooms.map((rm) =>
          rm.id === res.roomId ? { ...rm, status: "cleaning" as RoomStatus } : rm,
        ),
      };
    }),
  cancelReservation: (id) =>
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id ? { ...r, status: "cancelled" as ReservationStatus } : r,
      ),
    })),
  deleteReservation: (id) =>
    set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),

  addPayment: (p) =>
    set((s) => ({ payments: [...s.payments, { ...p, id: uid() }] })),
  updatePaymentStatus: (id, status) =>
    set((s) => ({
      payments: s.payments.map((p) => (p.id === id ? { ...p, status } : p)),
    })),

  updateSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),
}));

// Derived selectors
export const todayISO = () => new Date().toISOString().slice(0, 10);
