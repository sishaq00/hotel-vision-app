import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { logActivity } from "@/store/activity-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Hotel, Lock, User as UserIcon, AlertCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await login(username, password);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    logActivity({
      action: "login",
      entityType: "system",
      description: `Signed in as ${username.toLowerCase()}`,
    });
    toast.success(`Welcome ${username}`);
    onSuccess?.();
  };

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
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-medium">
              Username
            </Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="pl-9"
                placeholder="admin"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          {usersCount <= 1 && (
            <p className="rounded-md bg-muted/50 p-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
              Default admin: <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin123</span>
              <br />
              Change the password right after first login.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
