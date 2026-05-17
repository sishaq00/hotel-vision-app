// Top-level auth gate: shows the login screen when no user is signed in,
// enforces mustChangePassword, and auto-logs-out on idle timeout.
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuthStore, useCurrentUser, SESSION_IDLE_MS } from "@/store/auth-store";
import { LoginScreen } from "./LoginScreen";
import { useHotelStore } from "@/store/hotel-store";
import { ForceChangePasswordScreen } from "./ForceChangePasswordScreen";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export function AuthGate({ children }: { children: ReactNode }) {
  const ensureSeed = useAuthStore((s) => s.ensureSeed);
  const touchActivity = useAuthStore((s) => s.touchActivity);
  const checkIdleTimeout = useAuthStore((s) => s.checkIdleTimeout);
  const user         = useCurrentUser();
  const setupComplete = useHotelStore((s) => s.setupComplete);
  const [ready, setReady] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);

  // Hydrate store from localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeed();
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [ensureSeed]);

  // Track user activity to reset idle timer
  const handleActivity = useCallback(() => {
    setIdleWarning(false);
    touchActivity();
  }, [touchActivity]);

  useEffect(() => {
    if (!user) return;
    const EVENTS = ["mousemove", "keydown", "pointerdown", "touchstart", "scroll"];
    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
  }, [user, handleActivity]);

  // Poll for idle timeout every 60 seconds
  useEffect(() => {
    if (!user) return;
    const WARNING_BEFORE_MS = 5 * 60 * 1000; // warn 5 min before expiry

    const timer = setInterval(() => {
      const last = useAuthStore.getState().lastActivityAt;
      if (!last) return;
      const elapsed = Date.now() - last;

      // Show warning when 5 min remain
      if (elapsed >= SESSION_IDLE_MS - WARNING_BEFORE_MS) {
        setIdleWarning(true);
      }

      // Auto-logout when idle period expires
      if (checkIdleTimeout()) {
        setIdleWarning(false);
      }
    }, 60_000);

    return () => clearInterval(timer);
  }, [user, checkIdleTimeout]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user || !user.active) {
    return <LoginScreen />;
  }

  // Block access until the user changes their temporary password
  if (user.mustChangePassword) {
    return <ForceChangePasswordScreen />;
  }

  // Show onboarding wizard on first run
  if (!setupComplete) {
    return <OnboardingWizard />;
  }

  return (
    <>
      {idleWarning && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning shadow-lg">
          ⚠️ Your session will expire due to inactivity. Move the mouse to stay signed in.
        </div>
      )}
      {children}
    </>
  );
}
