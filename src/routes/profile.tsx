import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore, useCurrentUser, MIN_PASSWORD_LENGTH } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const me = useCurrentUser();
  const change = useAuthStore((s) => s.changeOwnPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (!me) {
    return (
      <AppLayout title="Profile">
        <p>Not signed in.</p>
      </AppLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const r = await change(current, next);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Password updated");
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <AppLayout title="My profile">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {me.role === "admin" ? <ShieldCheck className="h-7 w-7" /> : <UserIcon className="h-7 w-7" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{me.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                @{me.username} · {me.role === "admin" ? "Administrator" : "Staff"}
              </p>
            </div>
          </div>
          /* mustChangePassword is now enforced at the AuthGate level */
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Change password</h3>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy}>Update password</Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
