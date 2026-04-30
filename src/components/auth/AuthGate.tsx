// Top-level auth gate: shows the login screen when no user is signed in.
// Mounted in __root so every route is protected without per-route guards.
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({ children }: { children: ReactNode }) {
  const ensureSeed = useAuthStore((s) => s.ensureSeed);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const usersLen = useAuthStore((s) => s.users.length);
  const [ready, setReady] = useState(false);

  // Defer rendering until we are on the client and the store is rehydrated
  // from localStorage; this prevents an SSR flash of the login screen for
  // already-signed-in users.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeed();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureSeed]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Resolve current user from the latest snapshot
  const user =
    currentUserId !== null && usersLen > 0
      ? useAuthStore.getState().users.find((u) => u.id === currentUserId)
      : null;

  if (!user || !user.active) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
