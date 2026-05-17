// Offline auth store: users + current session, persisted in localStorage.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { hashPassword, verifyPassword, uid } from "@/lib/crypto";
import {
  DEFAULT_STAFF_PERMISSIONS,
  PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

export type UserRole = "admin" | "staff";

// Security constants
export const MIN_PASSWORD_LENGTH = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_IDLE_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  active: boolean;
  createdAt: string;
  mustChangePassword?: boolean;
}

// In-memory brute-force counters (intentionally not persisted)
const loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

export interface AuthState {
  users: AppUser[];
  currentUserId: string | null;
  initialized: boolean;
  lastActivityAt: number | null;

  ensureSeed: () => Promise<void>;

  login: (
    username: string,
    password: string,
  ) => Promise<
    | { ok: true; mustChangePassword?: boolean }
    | { ok: false; error: string; lockedUntil?: number }
  >;
  logout: () => void;
  touchActivity: () => void;
  checkIdleTimeout: () => boolean;

  createUser: (input: {
    username: string;
    fullName: string;
    password: string;
    role: UserRole;
    permissions?: Permission[];
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

  updateUser: (
    id: string,
    patch: Partial<Pick<AppUser, "fullName" | "role" | "permissions" | "active">>,
  ) => void;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  changeOwnPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteUser: (id: string) => { ok: boolean; error?: string };

  current: () => AppUser | null;
  hasPermission: (perm: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      initialized: false,
      lastActivityAt: null,

      ensureSeed: async () => {
        if (get().initialized && get().users.length > 0) return;
        if (get().users.length === 0) {
          const passwordHash = await hashPassword("admin123");
          const admin: AppUser = {
            id: uid(),
            username: "admin",
            fullName: "Administrator",
            passwordHash,
            role: "admin",
            permissions: [...PERMISSIONS],
            active: true,
            createdAt: new Date().toISOString(),
            mustChangePassword: true,
          };
          set({ users: [admin], initialized: true });
        } else {
          set({ initialized: true });
        }
      },

      login: async (username, password) => {
        const uname = username.trim().toLowerCase();

        // Check lockout
        const attempts = loginAttempts[uname];
        const now = Date.now();
        if (attempts && attempts.lockedUntil > now) {
          return {
            ok: false,
            error: `Too many failed attempts. Try again in ${Math.ceil((attempts.lockedUntil - now) / 60000)} min.`,
            lockedUntil: attempts.lockedUntil,
          };
        }

        const u = get().users.find((x) => x.username === uname);
        if (!u) {
          _recordFailedAttempt(uname, now);
          return { ok: false, error: "Invalid username or password" };
        }
        if (!u.active) return { ok: false, error: "This account is disabled" };

        const ok = await verifyPassword(password, u.passwordHash);
        if (!ok) {
          _recordFailedAttempt(uname, now);
          const remaining = MAX_ATTEMPTS - (loginAttempts[uname]?.count ?? 0);
          if (remaining <= 0) {
            return {
              ok: false,
              error: `Account locked for 15 minutes after too many failed attempts.`,
              lockedUntil: loginAttempts[uname].lockedUntil,
            };
          }
          return {
            ok: false,
            error: `Invalid username or password (${remaining} attempt${remaining === 1 ? "" : "s"} left)`,
          };
        }

        // Successful login — clear counters, upgrade legacy hash transparently
        delete loginAttempts[uname];
        set({ currentUserId: u.id, lastActivityAt: Date.now() });

        // Transparently re-hash legacy SHA-256 passwords to PBKDF2
        if (!u.passwordHash.startsWith("pbkdf2$")) {
          const newHash = await hashPassword(password);
          set((s) => ({
            users: s.users.map((x) =>
              x.id === u.id ? { ...x, passwordHash: newHash } : x,
            ),
          }));
        }

        return { ok: true, mustChangePassword: u.mustChangePassword };
      },

      logout: () => set({ currentUserId: null, lastActivityAt: null }),

      touchActivity: () => set({ lastActivityAt: Date.now() }),

      checkIdleTimeout: () => {
        const last = get().lastActivityAt;
        if (!last || !get().currentUserId) return false;
        if (Date.now() - last > SESSION_IDLE_MS) {
          set({ currentUserId: null, lastActivityAt: null });
          return true;
        }
        return false;
      },

      createUser: async ({ username, fullName, password, role, permissions }) => {
        const uname = username.trim().toLowerCase();
        if (!uname) return { ok: false, error: "Username is required" };
        if (uname.length < 3) return { ok: false, error: "Username too short (min 3 characters)" };
        if (password.length < MIN_PASSWORD_LENGTH)
          return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
        if (get().users.some((u) => u.username === uname))
          return { ok: false, error: "Username already exists" };

        const passwordHash = await hashPassword(password);
        const u: AppUser = {
          id: uid(),
          username: uname,
          fullName: fullName.trim() || uname,
          passwordHash,
          role,
          permissions:
            role === "admin" ? [...PERMISSIONS] : (permissions ?? DEFAULT_STAFF_PERMISSIONS),
          active: true,
          createdAt: new Date().toISOString(),
        };
        set({ users: [...get().users, u] });
        return { ok: true, id: u.id };
      },

      updateUser: (id, patch) => {
        set({
          users: get().users.map((u) => {
            if (u.id !== id) return u;
            const next = { ...u, ...patch };
            if (next.role === "admin") next.permissions = [...PERMISSIONS];
            return next;
          }),
        });
      },

      resetPassword: async (id, newPassword) => {
        const passwordHash = await hashPassword(newPassword);
        set({
          users: get().users.map((u) =>
            u.id === id ? { ...u, passwordHash, mustChangePassword: true } : u,
          ),
        });
      },

      changeOwnPassword: async (currentPassword, newPassword) => {
        const me = get().current();
        if (!me) return { ok: false, error: "Not signed in" };
        const ok = await verifyPassword(currentPassword, me.passwordHash);
        if (!ok) return { ok: false, error: "Current password is incorrect" };
        if (newPassword.length < MIN_PASSWORD_LENGTH)
          return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` };
        if (newPassword === currentPassword)
          return { ok: false, error: "New password must be different from the current one" };
        const passwordHash = await hashPassword(newPassword);
        set({
          users: get().users.map((u) =>
            u.id === me.id ? { ...u, passwordHash, mustChangePassword: false } : u,
          ),
        });
        return { ok: true };
      },

      deleteUser: (id) => {
        const u = get().users.find((x) => x.id === id);
        if (!u) return { ok: false, error: "User not found" };
        if (
          u.role === "admin" &&
          get().users.filter((x) => x.role === "admin").length === 1
        )
          return { ok: false, error: "Cannot delete the last admin" };
        set({
          users: get().users.filter((x) => x.id !== id),
          currentUserId: get().currentUserId === id ? null : get().currentUserId,
        });
        return { ok: true };
      },

      current: () => {
        const id = get().currentUserId;
        if (!id) return null;
        return get().users.find((u) => u.id === id) ?? null;
      },

      hasPermission: (perm) => {
        const u = get().current();
        if (!u || !u.active) return false;
        if (u.role === "admin") return true;
        return u.permissions.includes(perm);
      },
    }),
    {
      name: "nexora-auth-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            } as unknown as Storage)
          : window.localStorage,
      ),
      partialize: (s) => ({
        users: s.users,
        currentUserId: s.currentUserId,
        initialized: s.initialized,
        lastActivityAt: s.lastActivityAt,
      }),
    },
  ),
);

// Internal: record a failed login attempt and apply lockout if threshold reached
function _recordFailedAttempt(uname: string, now: number) {
  const prev = loginAttempts[uname] ?? { count: 0, lockedUntil: 0 };
  const count = prev.count + 1;
  loginAttempts[uname] = {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : prev.lockedUntil,
  };
}

// Convenience hooks
export function usePermission(perm: Permission): boolean {
  return useAuthStore((s) => {
    const u = s.currentUserId ? s.users.find((x) => x.id === s.currentUserId) : null;
    if (!u || !u.active) return false;
    if (u.role === "admin") return true;
    return u.permissions.includes(perm);
  });
}

export function useCurrentUser(): AppUser | null {
  return useAuthStore((s) => {
    const id = s.currentUserId;
    if (!id) return null;
    return s.users.find((u) => u.id === id) ?? null;
  });
}
