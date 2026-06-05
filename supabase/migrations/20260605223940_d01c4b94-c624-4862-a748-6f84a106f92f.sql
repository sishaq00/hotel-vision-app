
-- Drop duplicate auto-named FKs (kept: profiles_user_id_fkey, user_roles_user_id_fkey)
ALTER TABLE public.advance_deposits    DROP CONSTRAINT IF EXISTS advance_deposits_guest_id_fkey;
ALTER TABLE public.advance_deposits    DROP CONSTRAINT IF EXISTS advance_deposits_reservation_id_fkey;
ALTER TABLE public.audit_log           DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.credit_notes        DROP CONSTRAINT IF EXISTS credit_notes_reservation_id_fkey;
ALTER TABLE public.folio_charges       DROP CONSTRAINT IF EXISTS folio_charges_folio_id_fkey;
ALTER TABLE public.folios              DROP CONSTRAINT IF EXISTS folios_guest_id_fkey;
ALTER TABLE public.folios              DROP CONSTRAINT IF EXISTS folios_reservation_id_fkey;
ALTER TABLE public.housekeeper_reports DROP CONSTRAINT IF EXISTS housekeeper_reports_housekeeper_id_fkey;
ALTER TABLE public.housekeepers        DROP CONSTRAINT IF EXISTS housekeepers_user_id_fkey;
ALTER TABLE public.housekeeping_tasks  DROP CONSTRAINT IF EXISTS housekeeping_tasks_room_id_fkey;
ALTER TABLE public.lost_found          DROP CONSTRAINT IF EXISTS lost_found_claimed_by_guest_id_fkey;
ALTER TABLE public.lost_found          DROP CONSTRAINT IF EXISTS lost_found_room_id_fkey;
ALTER TABLE public.maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_room_id_fkey;
ALTER TABLE public.payments            DROP CONSTRAINT IF EXISTS payments_guest_id_fkey;
ALTER TABLE public.payments            DROP CONSTRAINT IF EXISTS payments_reservation_id_fkey;
ALTER TABLE public.product_sales       DROP CONSTRAINT IF EXISTS product_sales_guest_id_fkey;
ALTER TABLE public.product_sales       DROP CONSTRAINT IF EXISTS product_sales_product_id_fkey;
ALTER TABLE public.product_sales       DROP CONSTRAINT IF EXISTS product_sales_reservation_id_fkey;
ALTER TABLE public.reservations        DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;
ALTER TABLE public.reservations        DROP CONSTRAINT IF EXISTS reservations_room_id_fkey;
ALTER TABLE public.shifts              DROP CONSTRAINT IF EXISTS shifts_user_id_fkey;

-- Tighten RPC grants: revoke from PUBLIC and anon, allow only authenticated
REVOKE ALL ON FUNCTION public.check_in_reservation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_out_reservation(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_payment_with_audit(uuid, uuid, numeric, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.check_in_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_reservation(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_with_audit(uuid, uuid, numeric, text, text, text) TO authenticated;
