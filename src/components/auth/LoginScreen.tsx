import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { logActivity } from "@/store/activity-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Hotel, Lock, User as UserIcon, AlertCircle, ShieldOff } from "lucide-react";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

interface LoginScreenProps {
  onSuccess?: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const ensureSeed = useAuthStore((s) => s.ensureSeed);
  const login = useAuthStore((s) => s.login);
  const usersCount = useAuthStore((s) => s.users.length);
  const settings = useHotelStore((s) => s.settings);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  // Live countdown for lockout
  useEffect(() => {
    if (!lockedUntil) { setCountdown(null); return; }
    const tick = () => {
      const ms = lockedUntil - Date.now();
      if (ms <= 0) {
        setLockedUntil(null);
        setCountdown(null);
        setError(null);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.ceil((ms % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && lockedUntil > Date.now()) return;
    setError(null);
    setLoading(true);
    const r = await login(username, password);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      if ("lockedUntil" in r && r.lockedUntil) setLockedUntil(r.lockedUntil);
      return;
    }
    logActivity({
      action: "login",
      entityType: "system",
      description: `Signed in as ${username.toLowerCase()}`,
    });
    toast.success(`Welcome, ${username}`);
    onSuccess?.();
  };

  const isLocked = !!(lockedUntil && lockedUntil > Date.now());

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Hotel className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {settings.hotelName || "NEXORA OS"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-medium">Username</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                disabled={isLocked}
                className="pl-9"
                placeholder="admin"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLocked}
                className="pl-9"
              />
            </div>
          </div>

          {isLocked && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">Account temporarily locked</span>
                <br />
                Too many failed attempts. Try again in{" "}
                <span className="font-mono font-bold">{countdown}</span>.
              </div>
            </div>
          )}

          {!isLocked && error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading || isLocked} className="w-full">
            {loading ? "Signing in…" : isLocked ? `Locked (${countdown})` : "Sign in"}
          </Button>

          {usersCount <= 1 && (
            <p className="rounded-md bg-muted/50 p-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
              Default admin:{" "}
              <span className="font-mono font-semibold">admin</span> /{" "}
              <span className="font-mono font-semibold">admin123</span>
              <br />
              You will be required to change the password on first login.
            </p>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            <a href="/landing.html" className="hover:text-primary underline" target="_blank" rel="noopener noreferrer">
              About NEXORA OS →
            </a>
          </p>
        </form>
      </Card>
    </div>
  );
}
