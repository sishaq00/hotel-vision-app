
-- ============ Signatures ============
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  data_url text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_by_name text,
  signed_by_user uuid,
  guest_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signatures TO authenticated;
GRANT ALL ON public.signatures TO service_role;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage signatures" ON public.signatures FOR ALL
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_signatures_updated BEFORE UPDATE ON public.signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_signatures
  AFTER INSERT OR UPDATE OR DELETE ON public.signatures
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============ Backups ============
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'manual',
  payload jsonb NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read backups" ON public.backups FOR SELECT
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage backups" ON public.backups FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ Invoice numbering ============
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001 INCREMENT 1;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.issue_invoice_number(p_prefix text DEFAULT 'INV')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n bigint;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  SELECT nextval('public.invoice_number_seq') INTO v_n;
  RETURN COALESCE(NULLIF(p_prefix,''),'INV') || '-' || lpad(v_n::text, 6, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_invoice_number(text) TO authenticated;

-- ============ Realtime for settings + signatures ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname='supabase_realtime' AND tablename='hotel_settings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname='supabase_realtime' AND tablename='signatures') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.signatures';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname='supabase_realtime' AND tablename='backups') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.backups';
  END IF;
END $$;
