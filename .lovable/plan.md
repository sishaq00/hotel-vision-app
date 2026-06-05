# Phase 1 — Database Foundation

## 1. Pre-flight verification (already completed)

Row counts on every table that will receive a foreign key:

```text
rooms            = 5
hotel_settings   = 1
reservations     = 0   guests = 0   payments = 0
folios           = 0   folio_charges = 0
credit_notes     = 0   advance_deposits = 0
housekeeping_tasks = 0   maintenance_tickets = 0
lost_found = 0   product_sales = 0   audit_log = 0
```

Orphan scan (reservations→guests/rooms, payments→reservations/guests, folio_charges→folios): **0 orphan rows**.

**Conclusion: zero data-loss risk. No existing reservation, room, guest, or settings record will be modified or dropped.** The only persistent data are the 5 rooms and the singleton `hotel_settings` row; neither is touched by this migration.

## 2. Backup

Before approving the migration, take a logical backup so you can roll back even if the data is sparse:

```bash
pg_dump "$DATABASE_URL" --schema=public --no-owner --no-acl \
  -f nexora_backup_pre_phase1_$(date +%Y%m%d_%H%M%S).sql
```

Lovable Cloud also keeps an automatic point-in-time snapshot before every migration approval, so you can restore from the dashboard if needed.

## 3. Foreign keys to be added

All use `ON DELETE` rules chosen for hotel-operations safety (never silently delete child financial records).

| # | Child table.column | → Parent | On delete |
|---|---|---|---|
| 1 | reservations.guest_id | guests.id | RESTRICT |
| 2 | reservations.room_id | rooms.id | RESTRICT |
| 3 | reservations.group_master_id | group_masters.id | SET NULL |
| 4 | payments.reservation_id | reservations.id | RESTRICT |
| 5 | payments.guest_id | guests.id | SET NULL |
| 6 | folios.reservation_id | reservations.id | CASCADE |
| 7 | folios.guest_id | guests.id | SET NULL |
| 8 | folios.house_account_id | house_accounts.id | SET NULL |
| 9 | folio_charges.folio_id | folios.id | CASCADE |
| 10 | credit_notes.reservation_id | reservations.id | RESTRICT |
| 11 | advance_deposits.reservation_id | reservations.id | SET NULL |
| 12 | advance_deposits.guest_id | guests.id | SET NULL |
| 13 | housekeeping_tasks.room_id | rooms.id | CASCADE |
| 14 | housekeeping_tasks.assigned_to | housekeepers.id | SET NULL |
| 15 | housekeeper_reports.housekeeper_id | housekeepers.id | SET NULL |
| 16 | maintenance_tickets.room_id | rooms.id | SET NULL |
| 17 | lost_found.room_id | rooms.id | SET NULL |
| 18 | lost_found.claimed_by_guest_id | guests.id | SET NULL |
| 19 | product_sales.product_id | product_items.id | RESTRICT |
| 20 | product_sales.reservation_id | reservations.id | SET NULL |
| 21 | product_sales.guest_id | guests.id | SET NULL |
| 22 | rooms.assigned_housekeeper_id | housekeepers.id | SET NULL |

User-id columns (`reported_by`, `assigned_to`, `created_by`, `posted_by`, `sold_by`, `issued_by`, `user_id`, `found_by`) reference `auth.users(id)` with `ON DELETE SET NULL`.

## 4. Global audit trigger

A single trigger function `public.log_audit_event()` attached as `AFTER INSERT OR UPDATE OR DELETE` on:
reservations, payments, folios, folio_charges, credit_notes, advance_deposits, shifts, housekeeping_tasks, maintenance_tickets, product_sales, lost_found, house_accounts, rooms.

Each fired row inserts into `audit_log(user_id, action, entity, entity_id, details)` with `details` containing a JSON diff (`{old, new}`). `user_id` comes from `auth.uid()`.

## 5. Atomic RPCs

### `check_in_reservation(p_reservation_id uuid)`
1. Lock reservation row.
2. Validate status is `confirmed`.
3. UPDATE reservation: status=`checked-in`, checked_in_at=now().
4. UPDATE room: status=`occupied`.
5. INSERT folio (status=`open`) if none exists.
6. Return the folio id.
All in a single transaction; any failure raises and rolls back.

### `check_out_reservation(p_reservation_id uuid, p_final_amount numeric)`
1. Lock reservation + open folio.
2. Validate status is `checked-in`.
3. UPDATE reservation: status=`checked-out`, checked_out_at=now(), total_amount=p_final_amount.
4. UPDATE folio: status=`closed`, balance=0.
5. UPDATE room: status=`available`, housekeeping_status=`dirty`.
6. INSERT housekeeping_task (type=`checkout-clean`, status=`pending`).

### `record_payment_with_audit(p_reservation_id uuid, p_guest_id uuid, p_amount numeric, p_method text, p_status text, p_notes text)`
1. INSERT payment row.
2. If a folio is open for the reservation, INSERT folio_charge (negative amount = payment).
3. Audit trigger fires automatically.
4. Returns the payment id.

All three RPCs are `SECURITY DEFINER`, owner = postgres, `SET search_path = public`, and check `public.is_staff(auth.uid())` at the top — non-staff calls raise `insufficient_privilege`.

## 6. Rollback procedure

If any issue surfaces after approval:

**Option A — chat revert (recommended):** click the Revert button on the assistant message that ran the migration. Lovable restores the project + DB snapshot taken just before the migration.

**Option B — manual SQL** (run as a new migration):
```sql
-- Drop RPCs
DROP FUNCTION IF EXISTS public.check_in_reservation(uuid);
DROP FUNCTION IF EXISTS public.check_out_reservation(uuid, numeric);
DROP FUNCTION IF EXISTS public.record_payment_with_audit(uuid, uuid, numeric, text, text, text);

-- Drop audit triggers
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['reservations','payments','folios','folio_charges',
    'credit_notes','advance_deposits','shifts','housekeeping_tasks',
    'maintenance_tickets','product_sales','lost_found','house_accounts','rooms']
  LOOP EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t); END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.log_audit_event();

-- Drop FKs (names follow pattern fk_<table>_<column>)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS fk_reservations_guest_id;
-- … (one line per FK in the table above)
```

**Option C — full restore:** `psql "$DATABASE_URL" < nexora_backup_pre_phase1_*.sql`.

## 7. Verification steps after migration runs

I will run these and report results back:

1. `SELECT conname, conrelid::regclass FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY 1;` — must list all 22 FKs.
2. `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'audit_%';` — must list 13 triggers.
3. `SELECT proname FROM pg_proc WHERE proname IN ('check_in_reservation','check_out_reservation','record_payment_with_audit','log_audit_event');` — must return 4 rows.
4. `SELECT count(*) FROM rooms;` — must still be 5.
5. `SELECT count(*) FROM hotel_settings;` — must still be 1.
6. Insert a test guest + reservation + call `check_in_reservation` + `record_payment_with_audit` + `check_out_reservation`, then `SELECT * FROM audit_log` — must show all events.
7. Clean up the test rows.

## 8. What this phase does NOT change

- No application code is edited in Phase 1.
- No table is dropped, renamed, or has columns removed.
- No RLS policy is loosened.
- localStorage behaviour is untouched (that's Phase 2+).

## 9. Approval

After you approve the migration tool prompt, I will:
1. Run the migration.
2. Run all 7 verification queries.
3. Report exact results (counts, names, any warnings from Supabase linter).
4. Wait for your go-ahead before Phase 2.
