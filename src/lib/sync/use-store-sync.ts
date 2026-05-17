// Wires the Zustand hotel store to the sync engine.
// Mount this component once at the app root (inside AppBoot or similar).
//
// What it does:
//  1. When syncServerUrl changes in settings → connect / disconnect engine
//  2. When any store state changes → push affected "table" to engine
//  3. When engine receives remote changes → apply to local store
import { useEffect, useRef } from "react";
import { useHotelStore } from "@/store/hotel-store";
import { syncEngine } from "./sync-engine";

// Tables we sync — each maps to a top-level array/object in the store
const SYNC_TABLES = [
  "rooms",
  "reservations",
  "guests",
  "payments",
  "shifts",
  "folios",
  "houseAccounts",
  "housekeepers",
  "housekeepingTeams",
  "housekeeperReports",
  "maintenanceTickets",
  "reminders",
  "advanceDeposits",
  "lostFoundItems",
  "groupMasters",
  "inventoryItems",
  "productItems",
  "productSales",
  "creditNotes",
  "reportRuns",
] as const;

type TableName = (typeof SYNC_TABLES)[number];

/** Mount once inside the authenticated app shell. */
export function useStoreSync() {
  const settings   = useHotelStore((s) => s.settings);
  const syncUrl    = settings.syncServerUrl;
  const syncOn     = settings.syncEnabled ?? false;
  const prevUrl    = useRef<string | undefined>(undefined);

  // ── Connect / disconnect when URL or toggle changes ───────────────────────
  useEffect(() => {
    if (syncOn && syncUrl?.trim()) {
      if (syncUrl !== prevUrl.current) {
        prevUrl.current = syncUrl;
        syncEngine.connect(syncUrl);
      }
    } else {
      prevUrl.current = undefined;
      syncEngine.disconnect();
    }
    return () => {
      // Don't disconnect on component unmount — keep connection alive
    };
  }, [syncUrl, syncOn]);

  // ── Push local changes to engine ──────────────────────────────────────────
  useEffect(() => {
    // Subscribe to the raw Zustand store (not hook) to avoid infinite loops
    const unsub = useHotelStore.subscribe((state, prev) => {
      if (!syncOn || !syncUrl?.trim()) return;
      for (const table of SYNC_TABLES) {
        if (state[table] !== (prev as typeof state)[table]) {
          syncEngine.push(table, state[table]);
        }
      }
    });
    return unsub;
  }, [syncOn, syncUrl]);

  // ── Apply remote changes from engine ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { table, payload } = (e as CustomEvent<{ table: string; payload: unknown }>).detail;
      if (!SYNC_TABLES.includes(table as TableName)) return;

      // Directly patch the Zustand store state
      useHotelStore.setState({ [table]: payload } as Partial<ReturnType<typeof useHotelStore.getState>>);
    };
    window.addEventListener("nexora:sync:remote", handler);
    return () => window.removeEventListener("nexora:sync:remote", handler);
  }, []);
}
