import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const APP_ROLES = ['admin', 'manager', 'accountant', 'receptionist', 'housekeeping'] as const;

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Forbidden: admin only');
}

export const listStaff = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const ids = list.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from('profiles').select('user_id, full_name, username, active, phone, department').in('user_id', ids),
      supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', ids),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const rMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rMap.get(r.user_id) ?? [];
      arr.push(r.role as string);
      rMap.set(r.user_id, arr);
    }
    return list.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      profile: pMap.get(u.id) ?? null,
      roles: rMap.get(u.id) ?? [],
    }));
  });

export const createStaff = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6).max(72),
      fullName: z.string().min(1).max(120),
      role: z.enum(APP_ROLES),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;
    // Replace default role from trigger with the requested one
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    const { error: rErr } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: data.role });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, userId };
  });

export const updateStaffRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(APP_ROLES),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId);
    const { error } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      password: z.string().min(6).max(72),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error('Cannot delete yourself');
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ active: data.active })
      .eq('user_id', data.userId);
    if (error) throw new Error(error.message);
    // Also ban the user from logging in by setting ban_duration
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? 'none' : '876000h',
    });
    return { ok: true };
  });
