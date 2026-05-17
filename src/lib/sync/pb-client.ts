// PocketBase REST client — no SDK needed, just fetch.
// Used only for LAN sync; the app works 100% offline without it.

export interface PBRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export class PocketBaseClient {
  private baseUrl: string;
  private _token: string | null = null;
  private _sseSource: EventSource | null = null;

  constructor(url: string) {
    // Strip trailing slash
    this.baseUrl = url.replace(/\/$/, "");
  }

  get token() { return this._token; }
  get isAuthenticated() { return !!this._token; }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async authenticateAdmin(email: string, password: string): Promise<boolean> {
    try {
      const res = await this._fetch("/api/admins/auth-with-password", {
        method: "POST",
        body: JSON.stringify({ identity: email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this._token = data.token ?? null;
      return !!this._token;
    } catch {
      return false;
    }
  }

  // ── Health check ─────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const res = await this._fetch("/api/health", {}, 3000);
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Collections ──────────────────────────────────────────────────────────────

  /** Get single record by ID, or null if not found. */
  async getOne(collection: string, id: string): Promise<PBRecord | null> {
    try {
      const res = await this._fetch(`/api/collections/${collection}/records/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** List records, optionally filtered. */
  async getList(
    collection: string,
    opts: { filter?: string; sort?: string; perPage?: number; page?: number } = {},
  ): Promise<{ items: PBRecord[]; totalItems: number }> {
    const p = new URLSearchParams({
      perPage: String(opts.perPage ?? 200),
      page:    String(opts.page    ?? 1),
      ...(opts.filter ? { filter: opts.filter } : {}),
      ...(opts.sort   ? { sort:   opts.sort }   : {}),
    });
    try {
      const res = await this._fetch(`/api/collections/${collection}/records?${p}`);
      if (!res.ok) return { items: [], totalItems: 0 };
      const data = await res.json();
      return { items: data.items ?? [], totalItems: data.totalItems ?? 0 };
    } catch {
      return { items: [], totalItems: 0 };
    }
  }

  /** Create a record. Returns the created record or null. */
  async create(collection: string, data: Record<string, unknown>): Promise<PBRecord | null> {
    try {
      const res = await this._fetch(`/api/collections/${collection}/records`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** Update a record. Returns updated record or null. */
  async update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<PBRecord | null> {
    try {
      const res = await this._fetch(`/api/collections/${collection}/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** Upsert: create if not exists, update if exists. */
  async upsert(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<PBRecord | null> {
    const existing = await this.getOne(collection, id);
    if (existing) return this.update(collection, id, data);
    return this.create(collection, { id, ...data });
  }

  /** Delete a record. */
  async delete(collection: string, id: string): Promise<boolean> {
    try {
      const res = await this._fetch(`/api/collections/${collection}/records/${id}`, {
        method: "DELETE",
      });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  }

  // ── Real-time subscriptions ──────────────────────────────────────────────────

  /**
   * Subscribe to real-time changes on a collection.
   * Calls onEvent whenever a record is created, updated, or deleted.
   * Returns an unsubscribe function.
   */
  subscribe(
    collection: string,
    onEvent: (action: "create" | "update" | "delete", record: PBRecord) => void,
  ): () => void {
    // PocketBase real-time uses SSE
    const url = `${this.baseUrl}/api/realtime`;
    const source = new EventSource(url);

    source.addEventListener("open", () => {
      // Subscribe to the collection after connection opens
      fetch(`${this.baseUrl}/api/realtime`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify({ clientId: "", subscriptions: [`${collection}/*`] }),
      }).catch(() => {});
    });

    source.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.action && msg.record) {
          onEvent(msg.action, msg.record);
        }
      } catch {}
    });

    source.addEventListener("error", () => {
      // SSE auto-reconnects; nothing to do
    });

    this._sseSource = source;
    return () => source.close();
  }

  /** Close all open connections. */
  close() {
    this._sseSource?.close();
    this._sseSource = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this._token) h["Authorization"] = this._token;
    return h;
  }

  private _fetch(
    path: string,
    init: RequestInit = {},
    timeoutMs = 8000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this._headers(), ...(init.headers as Record<string, string> ?? {}) },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  }
}
