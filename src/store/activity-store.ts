// Per-user activity log — the source of truth for the user activity report.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/crypto";
import { useAuthStore } from "@/store/auth-store";

export type ActivityAction =
  | "login"
  | "logout"
  | "reservation.create"
  | "reservation.edit"
  | "reservation.cancel"
  | "reservation.extend"
  | "checkin"
  | "checkout"
  | "payment.record"
  | "payment.refund"
  | "night-audit"
  | "shift.open"
  | "shift.close"
  | "room.status-change"
  | "user.create"
  | "user.update"
  | "user.delete";

export type ActivityEntityType =
  | "reservation"
  | "payment"
  | "room"
  | "guest"
  | "user"
  | "shift"
  | "system";

export interface ActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  amount?: number;            // for financial actions (cash collected, refund, etc.)
  description: string;        // human-readable, e.g. "Checked out room 204 (John Doe)"
  details?: Record<string, unknown>;
}

interface ActivityState {
  entries: ActivityEntry[];
  log: (e: Omit<ActivityEntry, "id" | "timestamp" | "userId" | "userName">) => void;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      log: (e) => {
        const me = useAuthStore.getState().current();
        if (!me) return; // never log without an active session
        const entry: ActivityEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          userId: me.id,
          userName: me.fullName || me.username,
          ...e,
        };
        set((s) => ({ entries: [entry, ...s.entries].slice(0, 10000) }));
      },
      clear: () => set({ entries: [] }),
    }),
    {
      name: "nexora-activity-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            } as unknown as Storage)
          : window.localStorage,
      ),
    },
  ),
);

// Top-level helper so hotel-store actions can log without React hook context.
export function logActivity(
  e: Omit<ActivityEntry, "id" | "timestamp" | "userId" | "userName">,
): void {
  useActivityStore.getState().log(e);
}
