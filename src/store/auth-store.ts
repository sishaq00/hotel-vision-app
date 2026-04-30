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

export interface AppUser {
  id: string;
  username: string;       // login name, lowercase
  fullName: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[]; // ignored for admin (admin has all)
  active: boolean;
  createdAt: string;
  mustChangePassword?: boolean;
}

export interface AuthState {
  users: AppUser[];
  currentUserId: string | null;
  initialized: boolean;

  // bootstrap default admin if no users exist
  ensureSeed: () => Promise<void>;

  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;

  createUser: (input: {
    username: string;
    fullName: string;
    password: string;
    role: UserRole;
    permissions?: Permission[];
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

  updateUser: (id: string, patch: Partial<Pick<AppUser, "fullName" | "role" | "permissions" | "active">>) => void;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteUser: (id: string) => { ok: boolean; error?: string };

  // selectors
  current: () => AppUser | null;
  hasPermission: (perm: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      initialized: false,

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
        const u = get().users.find(
          (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
        );
        if (!u) return { ok: false, error: "Invalid username or password" };
        if (!u.active) return { ok: false, error: "This account is disabled" };
        const ok = await verifyPassword(password, u.passwordHash);
        if (!ok) return { ok: false, error: "Invalid username or password" };
        set({ currentUserId: u.id });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null }),

      createUser: async ({ username, fullName, password, role, permissions }) => {
        const uname = username.trim().toLowerCase();
        if (!uname) return { ok: false, error: "Username is required" };
        if (uname.length < 3) return { ok: false, error: "Username too short" };
        if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters" };
        if (get().users.some((u) => u.username === uname)) {
          return { ok: false, error: "Username already exists" };
        }
        const passwordHash = await hashPassword(password);
        const u: AppUser = {
          id: uid(),
          username: uname,
          fullName: fullName.trim() || uname,
          passwordHash,
          role,
          permissions: role === "admin" ? [...PERMISSIONS] : (permissions ?? DEFAULT_STAFF_PERMISSIONS),
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
        if (newPassword.length < 4) return { ok: false, error: "New password too short" };
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
        if (u.role === "admin" && get().users.filter((x) => x.role === "admin").length === 1) {
          return { ok: false, error: "Cannot delete the last admin" };
        }
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
      }),
    },
  ),
);

// Convenience hook for permission gating
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
