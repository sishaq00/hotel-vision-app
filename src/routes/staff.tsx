import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, KeyRound, Trash2, RefreshCw } from 'lucide-react';
import {
  listStaff, createStaff, updateStaffRole, deleteStaff,
  resetStaffPassword, setStaffActive,
} from '@/lib/staff.functions';

const ROLES = ['admin', 'manager', 'accountant', 'receptionist', 'housekeeping'] as const;
type Role = (typeof ROLES)[number];

export const Route = createFileRoute('/staff')({
  component: StaffPage,
});

function StaffPage() {
  return (
    <AppLayout title="Cloud Staff">
      <PermissionGate permission="users.manage">
        <StaffInner />
      </PermissionGate>
    </AppLayout>
  );
}

function StaffInner() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listStaff);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cloud-staff'],
    queryFn: () => fetchList(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [resetting, setResetting] = useState<{ id: string; email: string } | null>(null);

  const updateRoleFn = useServerFn(updateStaffRole);
  const deleteFn = useServerFn(deleteStaff);
  const setActiveFn = useServerFn(setStaffActive);

  const updateRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => updateRoleFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cloud-staff'] }); toast.success('Role updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cloud-staff'] }); toast.success('User deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (v: { userId: string; active: boolean }) => setActiveFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cloud-staff'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts that sync across all devices.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New staff
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last login</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((u) => {
                const role = (u.roles[0] ?? 'receptionist') as Role;
                const active = u.profile?.active ?? true;
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.profile?.full_name ?? u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={role}
                        onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as Role })}
                      >
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive.mutate({ userId: u.id, active: !active })}
                      >
                        {active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost"
                          onClick={() => setResetting({ id: u.id, email: u.email ?? '' })}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete ${u.email}?`)) removeUser.mutate(u.id);
                          }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && <CreateDialog onClose={() => setCreateOpen(false)} />}
      {resetting && (
        <ResetDialog
          userId={resetting.id}
          email={resetting.email}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(createStaff);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('receptionist');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await fn({ data: { email, password, fullName, role } });
      qc.invalidateQueries({ queryKey: ['cloud-staff'] });
      toast.success('Staff created');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New staff account</DialogTitle>
          <DialogDescription>They can sign in immediately on any device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Password (min 6)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const fn = useServerFn(resetStaffPassword);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 6) return toast.error('Min 6 characters');
    setBusy(true);
    try {
      await fn({ data: { userId, password: pw } });
      toast.success('Password reset');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
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
