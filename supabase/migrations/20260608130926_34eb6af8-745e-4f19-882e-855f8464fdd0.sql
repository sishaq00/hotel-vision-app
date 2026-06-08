
-- ============================================================
-- PHASE 3 — Operations workflow RPCs (Housekeeping/Maintenance/Lost&Found/Teams)
-- ============================================================

-- ---------- HOUSEKEEPING ------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_housekeeping_task(
  p_room_id uuid,
  p_housekeeper_id uuid,
  p_task_type text DEFAULT 'standard-clean'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_room_id IS NULL OR p_housekeeper_id IS NULL THEN
    RAISE EXCEPTION 'room_id and housekeeper_id are required';
  END IF;

  -- Reuse an existing open task for this room if there is one
  SELECT id INTO v_task_id FROM public.housekeeping_tasks
   WHERE room_id = p_room_id AND status IN ('pending','in-progress')
   ORDER BY created_at DESC LIMIT 1;

  IF v_task_id IS NULL THEN
    INSERT INTO public.housekeeping_tasks (room_id, task_type, status, assigned_to)
    VALUES (p_room_id, p_task_type, 'pending', p_housekeeper_id)
    RETURNING id INTO v_task_id;
  ELSE
    UPDATE public.housekeeping_tasks
       SET assigned_to = p_housekeeper_id,
           task_type   = p_task_type,
           updated_at  = now()
     WHERE id = v_task_id;
  END IF;

  UPDATE public.rooms
     SET assigned_housekeeper_id = p_housekeeper_id,
         assigned_at             = now(),
         assigned_by             = auth.uid(),
         task_type               = p_task_type,
         updated_at              = now()
   WHERE id = p_room_id;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_room_housekeeping_status(
  p_room_id uuid,
  p_status text -- 'dirty' | 'cleaning' | 'clean' | 'inspected'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('dirty','cleaning','clean','inspected') THEN
    RAISE EXCEPTION 'invalid housekeeping status: %', p_status;
  END IF;

  UPDATE public.rooms
     SET housekeeping_status   = p_status,
         cleaning_started_at   = CASE WHEN p_status = 'cleaning' THEN now()
                                      ELSE cleaning_started_at END,
         cleaning_finished_at  = CASE WHEN p_status IN ('clean','inspected') THEN now()
                                      ELSE cleaning_finished_at END,
         updated_at            = now()
   WHERE id = p_room_id;

  -- Close any open task when room is marked clean or inspected
  IF p_status IN ('clean','inspected') THEN
    UPDATE public.housekeeping_tasks
       SET status = 'completed', updated_at = now()
     WHERE room_id = p_room_id AND status IN ('pending','in-progress');
  ELSIF p_status = 'cleaning' THEN
    UPDATE public.housekeeping_tasks
       SET status = 'in-progress', updated_at = now()
     WHERE room_id = p_room_id AND status = 'pending';
  END IF;
END;
$$;

-- ---------- MAINTENANCE ------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_maintenance_ticket(
  p_ticket_id uuid,
  p_technician_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  UPDATE public.maintenance_tickets
     SET assigned_to = p_technician_id,
         status      = CASE WHEN status = 'open' THEN 'in-progress' ELSE status END,
         updated_at  = now()
   WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'maintenance_ticket_not_found %', p_ticket_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_maintenance_ticket(
  p_ticket_id uuid,
  p_resolution_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  UPDATE public.maintenance_tickets
     SET status       = 'completed',
         resolved_at  = now(),
         description  = COALESCE(
                          CASE WHEN p_resolution_notes IS NOT NULL
                               THEN description || E'\n\n[Resolution] ' || p_resolution_notes
                               ELSE description END,
                          description),
         updated_at   = now()
   WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'maintenance_ticket_not_found %', p_ticket_id;
  END IF;
END;
$$;

-- ---------- LOST & FOUND -----------------------------------------------

CREATE OR REPLACE FUNCTION public.set_lost_found_location(
  p_item_id uuid,
  p_location text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  UPDATE public.lost_found
     SET extra      = COALESCE(extra, '{}'::jsonb)
                      || jsonb_build_object('storageLocation', p_location),
         updated_at = now()
   WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lost_found_item_not_found %', p_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_lost_found_item(
  p_item_id uuid,
  p_guest_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  UPDATE public.lost_found
     SET status              = 'returned',
         claimed_by_guest_id = p_guest_id,
         claimed_at          = now(),
         updated_at          = now()
   WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lost_found_item_not_found %', p_item_id;
  END IF;
END;
$$;

-- ---------- TEAMS AUDIT TRIGGER ----------------------------------------

DROP TRIGGER IF EXISTS audit_housekeeping_teams_ins ON public.housekeeping_teams;
DROP TRIGGER IF EXISTS audit_housekeeping_teams_upd ON public.housekeeping_teams;
DROP TRIGGER IF EXISTS audit_housekeeping_teams_del ON public.housekeeping_teams;

CREATE TRIGGER audit_housekeeping_teams_ins
  AFTER INSERT ON public.housekeeping_teams
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_housekeeping_teams_upd
  AFTER UPDATE ON public.housekeeping_teams
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_housekeeping_teams_del
  AFTER DELETE ON public.housekeeping_teams
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ---------- PERMISSIONS ------------------------------------------------

REVOKE ALL ON FUNCTION public.assign_housekeeping_task(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_room_housekeeping_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_maintenance_ticket(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_maintenance_ticket(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_lost_found_location(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_lost_found_item(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assign_housekeeping_task(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_room_housekeeping_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_maintenance_ticket(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_ticket(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_lost_found_location(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_lost_found_item(uuid, uuid) TO authenticated;
