// Shown when mustChangePassword === true. Blocks all access until the
// user picks a new, strong password.
import { useState } from "react";
import { useAuthStore, MIN_PASSWORD_LENGTH } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function ForceChangePasswordScreen() {
  const changeOwnPassword = useAuthStore((s) => s.changeOwnPassword);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.current());

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setLoading(true);
    const result = await changeOwnPassword(current, next);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Password changed successfully. Welcome!");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-warning text-warning-foreground shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Change Your Password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hello <strong>{user?.fullName || user?.username}</strong> — your account requires a new password before you can continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw" className="text-xs font-medium">
              Current password
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="current-pw"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoFocus
                required
                className="pl-9"
                placeholder="Your current / temporary password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-xs font-medium">
              New password <span className="text-muted-foreground">(min {MIN_PASSWORD_LENGTH} characters)</span>
            </Label>
            <Input
              id="new-pw"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw" className="text-xs font-medium">
              Confirm new password
            </Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Set new password & continue"}
          </Button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </Card>
    </div>
  );
}
