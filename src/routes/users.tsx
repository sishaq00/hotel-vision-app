import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useAuthStore, type AppUser, type UserRole } from "@/store/auth-store";
import { logActivity } from "@/store/activity-store";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, KeyRound, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <AppLayout title="Users & Permissions">
      <PermissionGate permission="users.manage">
        <UsersInner />
      </PermissionGate>
    </AppLayout>
  );
}

function UsersInner() {
  const users = useAuthStore((s) => s.users);
  const updateUser = useAuthStore((s) => s.updateUser);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const me = useAuthStore((s) =>
    s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : null,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Create accounts for reception/staff and decide exactly what each one can do.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New user
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {u.role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium">{u.fullName}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.role === "admin"
                    ? "All permissions"
                    : `${u.permissions.length} of ${PERMISSIONS.length}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.active}
                      disabled={u.id === me?.id}
                      onCheckedChange={(v) => {
                        updateUser(u.id, { active: v });
                        logActivity({
                          action: "user.update",
                          entityType: "user",
                          entityId: u.id,
                          description: `${v ? "Enabled" : "Disabled"} user ${u.username}`,
                        });
                        toast.success(v ? "User enabled" : "User disabled");
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setResetting(u)}>
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={u.id === me?.id}
                      onClick={() => {
                        if (!confirm(`Delete user ${u.username}?`)) return;
                        const r = deleteUser(u.id);
                        if (!r.ok) {
                          toast.error(r.error ?? "Failed");
                        } else {
                          logActivity({
                            action: "user.delete",
                            entityType: "user",
                            entityId: u.id,
                            description: `Deleted user ${u.username}`,
                          });
                          toast.success("User deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Offline note:</strong> all data
          (including users and password hashes) is stored on this device only. To
          protect against an attacker with physical access, lock the device and
          download regular backups from Settings.
        </p>
      </Card>

      {createOpen && (
        <CreateUserDialog onClose={() => setCreateOpen(false)} />
      )}
      {editing && (
        <EditPermissionsDialog user={editing} onClose={() => setEditing(null)} />
      )}
      {resetting && (
        <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const createUser = useAuthStore((s) => s.createUser);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [perms, setPerms] = useState<Permission[]>(DEFAULT_STAFF_PERMISSIONS);
  const [busy, setBusy] = useState(false);

  const togglePerm = (p: Permission) =>
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submit = async () => {
    setBusy(true);
    const r = await createUser({ username, fullName, password, role, permissions: perms });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    logActivity({
      action: "user.create",
      entityType: "user",
      entityId: r.id,
      description: `Created ${role} user ${username}`,
    });
    toast.success("User created");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>
            Choose role and pick exactly what this user can do.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="reception1" />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Sara Khalil" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff (Reception)</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {role === "staff" && (
          <PermissionsPicker selected={perms} onToggle={togglePerm} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>Create user</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPermissionsDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [perms, setPerms] = useState<Permission[]>(user.permissions);

  const togglePerm = (p: Permission) =>
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const save = () => {
    updateUser(user.id, { fullName, role, permissions: perms });
    logActivity({
      action: "user.update",
      entityType: "user",
      entityId: user.id,
      description: `Updated permissions for ${user.username}`,
      details: { role, permissionsCount: perms.length },
    });
    toast.success("User updated");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit user — @{user.username}</DialogTitle>
          <DialogDescription>Update role, name, and permissions.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff (Reception)</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {role === "staff" && (
          <PermissionsPicker selected={perms} onToggle={togglePerm} />
        )}
        {role === "admin" && (
          <p className="rounded bg-muted/40 p-3 text-xs text-muted-foreground">
            Administrators always have every permission.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setBusy(true);
    await resetPassword(user.id, pw);
    setBusy(false);
    logActivity({
      action: "user.update",
      entityType: "user",
      entityId: user.id,
      description: `Reset password for ${user.username}`,
    });
    toast.success("Password reset");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password — @{user.username}</DialogTitle>
          <DialogDescription>
            The user will be asked to change it on next login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsPicker({
  selected,
  onToggle,
}: {
  selected: Permission[];
  onToggle: (p: Permission) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Permissions for this staff user
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.label} className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">{g.label}</p>
            {g.items.map((it) => (
              <label key={it.key} className="flex items-start gap-2 text-xs">
                <Checkbox
                  checked={selected.includes(it.key)}
                  onCheckedChange={() => onToggle(it.key)}
                  className="mt-0.5"
                />
                <span className="text-muted-foreground">{it.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
