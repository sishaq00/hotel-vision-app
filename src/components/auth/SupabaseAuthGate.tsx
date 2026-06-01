// Cloud authentication gate. Wraps the existing local AuthGate so the rest of
// the app keeps working unchanged, but requires a real Supabase session first.
//
// Flow:
//   1. Subscribe to supabase.auth.onAuthStateChange (single source of truth).
//   2. If no session  → render <SupabaseAuthScreen />.
//   3. If session     → ensure local store is seeded, auto-elevate the seeded
//      admin as currentUserId, then render the existing <AuthGate>.
//
// The local store still drives permissions / UI; we'll migrate it page-by-page.
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { pullFromCloud, startCloudSync, stopCloudSync } from "@/integrations/sync/cloud-sync";
import { SupabaseAuthScreen } from "./SupabaseAuthScreen";
import { AuthGate } from "./AuthGate";

export function SupabaseAuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // 1. Subscribe FIRST to avoid missing events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(!!session);
        if (session) {
          setTimeout(() => {
            void bridgeLocalSession();
          }, 0);
        } else {
          stopCloudSync();
          useAuthStore.getState().logout();
        }
      },
    );

    // 2. Then check existing session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      if (session) void bridgeLocalSession();
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!hasSession) {
    return <SupabaseAuthScreen />;
  }

  return <AuthGate>{children}</AuthGate>;
}

// Seed local store (if empty) and mark the first admin as the current user.
// This bypasses the local password check because Supabase has already
// authenticated the user.
async function bridgeLocalSession() {
  const store = useAuthStore.getState();
  await store.ensureSeed();
  const fresh = useAuthStore.getState();
  if (!fresh.currentUserId) {
    const admin = fresh.users.find((u) => u.role === "admin" && u.active);
    if (admin) {
      useAuthStore.setState({
        currentUserId: admin.id,
        lastActivityAt: Date.now(),
      });
    }
  }
  // Pull cloud data into local store, then start two-way sync.
  await pullFromCloud();
  startCloudSync();
}
