// Sync engine: bridges Zustand (localStorage) ↔ PocketBase (LAN server).
//
// Strategy (simple & reliable for hotels):
//  • ONE record per entity type in PocketBase (id = fixed slug).
//  • Full-collection snapshots — not field-level diffs.
//  • Last-write-wins with timestamp guard: only apply remote change if
//    the remote timestamp is newer than our last-applied timestamp.
//  • Offline queue: changes made while server is unreachable are buffered
//    and flushed automatically when connection is restored.
//  • Debounce: local writes are batched every 800ms to avoid hammering
//    the server on rapid consecutive actions (e.g. bulk check-in).
//
// Collections in PocketBase (created automatically on first sync):
//   hotel_sync  — single record per "table" (id = table name)
//     fields: table (text), payload (json), device_id (text), ts (number)

import { PocketBaseClient } from "./pb-client";

export type SyncStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingChanges: number;
  error: string | null;
  serverUrl: string | null;
}

type Listener = (state: SyncState) => void;

const COLLECTION = "hotel_sync";
const DEVICE_ID  = _getOrCreateDeviceId();
const DEBOUNCE_MS = 800;

function _getOrCreateDeviceId(): string {
  const key = "nexora-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

class SyncEngine {
  private _client: PocketBaseClient | null = null;
  private _state: SyncState = {
    status: "disconnected", lastSyncAt: null, pendingChanges: 0, error: null, serverUrl: null,
  };
  private _listeners = new Set<Listener>();
  private _queue = new Map<string, unknown>();          // table → payload
  private _appliedTs = new Map<string, number>();       // table → last applied remote ts
  private _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _unsub: (() => void) | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _flushTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  getState(): SyncState { return { ...this._state }; }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    fn(this.getState());
    return () => this._listeners.delete(fn);
  }

  /** Connect to a PocketBase server. Call whenever settings change. */
  async connect(serverUrl: string): Promise<boolean> {
    this._disconnect();
    if (!serverUrl?.trim()) return false;

    this._client = new PocketBaseClient(serverUrl);
    this._setState({ status: "connecting", serverUrl, error: null });

    const alive = await this._client.ping();
    if (!alive) {
      this._setState({ status: "error", error: "Cannot reach server at " + serverUrl });
      this._scheduleReconnect(serverUrl);
      return false;
    }

    this._setState({ status: "connected", error: null });
    await this._doFullSync();
    this._startRealtimeSubscription();
    return true;
  }

  /** Disconnect and stop syncing. */
  disconnect() {
    this._disconnect();
    this._setState({ status: "disconnected", serverUrl: null, error: null });
  }

  /**
   * Enqueue a local change for a specific "table".
   * Debounced — multiple calls within DEBOUNCE_MS are merged.
   */
  push(table: string, payload: unknown) {
    this._queue.set(table, payload);
    this._setState({ pendingChanges: this._queue.size });

    const existing = this._debounceTimers.get(table);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this._debounceTimers.delete(table);
      this._flushOne(table);
    }, DEBOUNCE_MS);

    this._debounceTimers.set(table, timer);
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  private async _doFullSync() {
    if (!this._client) return;
    this._setState({ status: "syncing" });

    // Fetch all records from server
    const { items } = await this._client.getList(COLLECTION, { perPage: 200 });
    for (const item of items) {
      const table = item["table"] as string;
      const ts    = item["ts"] as number ?? 0;
      const prev  = this._appliedTs.get(table) ?? 0;
      if (ts > prev) {
        // Server is newer — apply to local store
        this._applyRemote(table, item["payload"] as unknown, ts);
      }
    }

    // Push any locally queued changes that happened while offline
    if (this._queue.size > 0) {
      await this._flushAll();
    }

    this._setState({ status: "connected", lastSyncAt: Date.now() });
  }

  private async _flushOne(table: string) {
    if (!this._client || !this._queue.has(table)) return;
    if (this._state.status === "disconnected") return;

    const payload = this._queue.get(table);
    const ts      = Date.now();

    const result = await this._client.upsert(COLLECTION, table, {
      table,
      payload,
      device_id: DEVICE_ID,
      ts,
    });

    if (result) {
      this._queue.delete(table);
      this._appliedTs.set(table, ts);
      this._setState({
        pendingChanges: this._queue.size,
        lastSyncAt: Date.now(),
      });
    } else {
      // Failed — keep in queue, schedule retry
      this._setState({ status: "error", error: "Sync failed — will retry" });
      this._scheduleReconnect(this._state.serverUrl!);
    }
  }

  private async _flushAll() {
    const tables = Array.from(this._queue.keys());
    await Promise.all(tables.map((t) => this._flushOne(t)));
  }

  private _startRealtimeSubscription() {
    if (!this._client) return;
    this._unsub = this._client.subscribe(COLLECTION, (action, record) => {
      if (action === "delete") return;
      const table     = record["table"] as string;
      const ts        = record["ts"] as number ?? 0;
      const deviceId  = record["device_id"] as string;

      // Ignore changes originating from this device
      if (deviceId === DEVICE_ID) return;

      const prev = this._appliedTs.get(table) ?? 0;
      if (ts > prev) {
        this._applyRemote(table, record["payload"] as unknown, ts);
        this._setState({ lastSyncAt: Date.now() });
      }
    });
  }

  private _applyRemote(table: string, payload: unknown, ts: number) {
    this._appliedTs.set(table, ts);
    // Dispatch custom event — the store listener picks this up
    window.dispatchEvent(
      new CustomEvent("nexora:sync:remote", { detail: { table, payload } }),
    );
  }

  private _scheduleReconnect(url: string) {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      if (this._state.serverUrl === url) {
        await this.connect(url);
      }
    }, 15_000); // retry in 15s
  }

  private _disconnect() {
    this._unsub?.();
    this._unsub = null;
    this._client?.close();
    this._client = null;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    this._debounceTimers.forEach((t) => clearTimeout(t));
    this._debounceTimers.clear();
  }

  private _setState(patch: Partial<SyncState>) {
    this._state = { ...this._state, ...patch };
    this._listeners.forEach((fn) => fn(this.getState()));
  }
}

// Singleton — one sync engine for the entire app
export const syncEngine = new SyncEngine();

// ── React hook ───────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(() => syncEngine.getState());
  useEffect(() => syncEngine.subscribe(setState), []);
  return state;
}
