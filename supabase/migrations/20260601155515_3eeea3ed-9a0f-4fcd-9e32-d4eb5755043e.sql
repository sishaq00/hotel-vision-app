-- ============= EXTENSIONS & ENUMS =============
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'receptionist', 'housekeeping', 'accountant');

-- ============= UTIL FUNCTION =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  department TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'receptionist'::public.app_role END);

  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= STAFF-ACCESS HELPER =============
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- ============= GUESTS =============
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  nationality TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  id_type TEXT,
  id_number TEXT,
  vip BOOLEAN DEFAULT false,
  do_not_rent BOOLEAN DEFAULT false,
  notes TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  extra JSONB DEFAULT '{}'::jsonb,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access guests" ON public.guests FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_guests_updated BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= ROOMS =============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  type_code TEXT,
  floor INT NOT NULL DEFAULT 0,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  housekeeping_status TEXT,
  smoking_allowed BOOLEAN DEFAULT false,
  accessible BOOLEAN DEFAULT false,
  zone TEXT,
  building TEXT,
  bed_code TEXT,
  task_type TEXT,
  assigned_housekeeper_id UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  cleaning_started_at TIMESTAMPTZ,
  cleaning_finished_at TIMESTAMPTZ,
  cleaning_value NUMERIC(12,2),
  dnd_flag BOOLEAN DEFAULT false,
  refused_service BOOLEAN DEFAULT false,
  housekeeping_notes TEXT,
  housekeeping_photos JSONB DEFAULT '[]'::jsonb,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access rooms" ON public.rooms FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= RESERVATIONS =============
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  invoice JSONB,
  source TEXT,
  no_show BOOLEAN DEFAULT false,
  group_master_id UUID,
  confirmation_number TEXT,
  notes TEXT,
  last_nightly_charge_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservations_guest ON public.reservations(guest_id);
CREATE INDEX idx_reservations_room ON public.reservations(room_id);
CREATE INDEX idx_reservations_status ON public.reservations(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access reservations" ON public.reservations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= CREDIT NOTES =============
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  issued_by UUID,
  cancel_invoice BOOLEAN DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access credit_notes" ON public.credit_notes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= PAYMENTS =============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_reservation ON public.payments(reservation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access payments" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= ADVANCE DEPOSITS =============
CREATE TABLE public.advance_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advance_deposits TO authenticated;
GRANT ALL ON public.advance_deposits TO service_role;
ALTER TABLE public.advance_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access advance_deposits" ON public.advance_deposits FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_advance_deposits_updated BEFORE UPDATE ON public.advance_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= MAINTENANCE =============
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  reported_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tickets TO authenticated;
GRANT ALL ON public.maintenance_tickets TO service_role;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access maintenance" ON public.maintenance_tickets FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= HOUSEKEEPERS / TEAMS / TASKS / REPORTS =============
CREATE TABLE public.housekeepers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'external',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.housekeepers TO authenticated;
GRANT ALL ON public.housekeepers TO service_role;
ALTER TABLE public.housekeepers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access housekeepers" ON public.housekeepers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_housekeepers_updated BEFORE UPDATE ON public.housekeepers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.housekeeping_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  member_ids JSONB DEFAULT '[]'::jsonb,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.housekeeping_teams TO authenticated;
GRANT ALL ON public.housekeeping_teams TO service_role;
ALTER TABLE public.housekeeping_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access teams" ON public.housekeeping_teams FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.housekeeping_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.housekeeping_tasks TO authenticated;
GRANT ALL ON public.housekeeping_tasks TO service_role;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access hk_tasks" ON public.housekeeping_tasks FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_hk_tasks_updated BEFORE UPDATE ON public.housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.housekeeper_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  housekeeper_id UUID REFERENCES public.housekeepers(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  rooms JSONB DEFAULT '[]'::jsonb,
  total_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.housekeeper_reports TO authenticated;
GRANT ALL ON public.housekeeper_reports TO service_role;
ALTER TABLE public.housekeeper_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access hk_reports" ON public.housekeeper_reports FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_hk_reports_updated BEFORE UPDATE ON public.housekeeper_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= LOST & FOUND =============
CREATE TABLE public.lost_found (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  found_by UUID,
  status TEXT NOT NULL DEFAULT 'storage',
  claimed_by_guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_found TO authenticated;
GRANT ALL ON public.lost_found TO service_role;
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access lost_found" ON public.lost_found FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_lost_found_updated BEFORE UPDATE ON public.lost_found FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= GROUP MASTERS =============
CREATE TABLE public.group_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  rate NUMERIC(12,2),
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_masters TO authenticated;
GRANT ALL ON public.group_masters TO service_role;
ALTER TABLE public.group_masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access group_masters" ON public.group_masters FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_group_masters_updated BEFORE UPDATE ON public.group_masters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= FOLIOS & CHARGES =============
CREATE TABLE public.folios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  house_account_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  balance NUMERIC(12,2) DEFAULT 0,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folios TO authenticated;
GRANT ALL ON public.folios TO service_role;
ALTER TABLE public.folios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access folios" ON public.folios FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_folios_updated BEFORE UPDATE ON public.folios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.folio_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id UUID NOT NULL REFERENCES public.folios(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  posted_by UUID,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folio_charges TO authenticated;
GRANT ALL ON public.folio_charges TO service_role;
ALTER TABLE public.folio_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access folio_charges" ON public.folio_charges FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= HOUSE ACCOUNTS =============
CREATE TABLE public.house_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  credit_limit NUMERIC(12,2),
  balance NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.house_accounts TO authenticated;
GRANT ALL ON public.house_accounts TO service_role;
ALTER TABLE public.house_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access house_accounts" ON public.house_accounts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_house_accounts_updated BEFORE UPDATE ON public.house_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= INVENTORY =============
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  cost NUMERIC(12,2),
  reorder_level NUMERIC(12,2),
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access inventory" ON public.inventory_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= PRODUCTS & SALES =============
CREATE TABLE public.product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2),
  quantity NUMERIC(12,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_items TO authenticated;
GRANT ALL ON public.product_items TO service_role;
ALTER TABLE public.product_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access product_items" ON public.product_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.product_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.product_items(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  sold_by UUID,
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_reservation ON public.product_sales(reservation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales TO authenticated;
GRANT ALL ON public.product_sales TO service_role;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access sales" ON public.product_sales FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= ROUTING RULES =============
CREATE TABLE public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  action JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routing_rules TO authenticated;
GRANT ALL ON public.routing_rules TO service_role;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access routing" ON public.routing_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_routing_updated BEFORE UPDATE ON public.routing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= SHIFTS =============
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(12,2) DEFAULT 0,
  closing_balance NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access shifts" ON public.shifts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= REMINDERS =============
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  completed BOOLEAN DEFAULT false,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access reminders" ON public.reminders FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= AUDIT LOG =============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff write audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete audit" ON public.audit_log FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============= HOTEL SETTINGS =============
CREATE TABLE public.hotel_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  currency TEXT DEFAULT 'USD',
  tax_rate NUMERIC(6,4) DEFAULT 0,
  service_fee_rate NUMERIC(6,4) DEFAULT 0,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);
GRANT SELECT ON public.hotel_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hotel_settings TO authenticated;
GRANT ALL ON public.hotel_settings TO service_role;
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read settings" ON public.hotel_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers modify settings" ON public.hotel_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.hotel_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hotel_settings (id, name, currency) VALUES (1, 'My Hotel', 'USD');