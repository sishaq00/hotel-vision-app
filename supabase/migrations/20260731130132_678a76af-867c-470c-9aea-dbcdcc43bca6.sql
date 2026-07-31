CREATE OR REPLACE FUNCTION public.run_reservation_rpc_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid;
  v_guest uuid;
  v_room uuid;
  v_room2 uuid;
  v_arch uuid;
  v_r1 uuid; v_r2 uuid; v_r3 uuid;
  v_ci date := current_date + 400;
  v_co date := current_date + 403;
  v_audit_before int;
  v_audit_after int;
  v_res jsonb := '[]'::jsonb;
  v_folio uuid;
  v_err text;
BEGIN
  SELECT user_id INTO v_user FROM public.user_roles LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user::text, 'role','authenticated')::text, true);

  SELECT id INTO v_guest FROM public.guests LIMIT 1;
  SELECT id INTO v_room FROM public.rooms WHERE COALESCE(archived,false)=false ORDER BY number LIMIT 1;
  SELECT id INTO v_room2 FROM public.rooms WHERE COALESCE(archived,false)=false AND id<>v_room ORDER BY number LIMIT 1;

  SELECT count(*) INTO v_audit_before FROM public.audit_log WHERE entity='reservation';

  -- T1 create
  v_r1 := public.create_reservation(v_guest, v_room, v_ci, v_co, 300);
  v_res := v_res || jsonb_build_object('test','T1 create_reservation','result', CASE WHEN v_r1 IS NOT NULL THEN 'PASS' ELSE 'FAIL' END);

  -- T2 double booking (overlapping dates, same room, second "device")
  BEGIN
    v_r2 := public.create_reservation(v_guest, v_room, v_ci + 1, v_co + 1, 300);
    v_res := v_res || jsonb_build_object('test','T2 double booking blocked','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T2 double booking blocked','result','PASS','error',v_err);
  END;

  -- T3 invalid dates
  BEGIN
    PERFORM public.create_reservation(v_guest, v_room2, v_co, v_ci, 100);
    v_res := v_res || jsonb_build_object('test','T3 check_out<=check_in rejected','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T3 check_out<=check_in rejected','result','PASS','error',v_err);
  END;

  -- T4 nonexistent room
  BEGIN
    PERFORM public.create_reservation(v_guest, gen_random_uuid(), v_ci, v_co, 100);
    v_res := v_res || jsonb_build_object('test','T4 unknown room rejected','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T4 unknown room rejected','result','PASS','error',v_err);
  END;

  -- T5 archived room
  INSERT INTO public.rooms (number, floor, type, price, status, archived)
  VALUES ('TEST-ARCH-'||floor(random()*100000)::text, 9, 'test', 1, 'available', true)
  RETURNING id INTO v_arch;
  BEGIN
    PERFORM public.create_reservation(v_guest, v_arch, v_ci, v_co, 100);
    v_res := v_res || jsonb_build_object('test','T5 archived room rejected','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T5 archived room rejected','result','PASS','error',v_err);
  END;

  -- T6 invalid status blocked by CHECK
  BEGIN
    UPDATE public.reservations SET status='weird' WHERE id=v_r1;
    v_res := v_res || jsonb_build_object('test','T6 status CHECK constraint','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T6 status CHECK constraint','result','PASS','error',v_err);
  END;

  -- T7 check-in
  v_folio := public.check_in_reservation(v_r1);
  v_res := v_res || jsonb_build_object('test','T7 check_in_reservation','result',
    CASE WHEN v_folio IS NOT NULL AND (SELECT status FROM public.reservations WHERE id=v_r1)='checked-in'
      THEN 'PASS' ELSE 'FAIL' END);

  -- T8 second device check-in on same reservation
  BEGIN
    PERFORM public.check_in_reservation(v_r1);
    v_res := v_res || jsonb_build_object('test','T8 duplicate check-in blocked','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T8 duplicate check-in blocked','result','PASS','error',v_err);
  END;

  -- T9 failed transaction rollback: update to a conflicting room must leave row untouched
  INSERT INTO public.reservations (guest_id, room_id, check_in, check_out, status, total_amount)
  VALUES (v_guest, v_room2, v_ci, v_co, 'confirmed', 100) RETURNING id INTO v_r3;
  BEGIN
    PERFORM public.update_reservation(v_r3, v_room, NULL, NULL, NULL, NULL);
    v_res := v_res || jsonb_build_object('test','T9 conflicting update rolled back','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T9 conflicting update rolled back','result',
      CASE WHEN (SELECT room_id FROM public.reservations WHERE id=v_r3)=v_room2 THEN 'PASS' ELSE 'FAIL (partial write)' END,
      'error', v_err);
  END;

  -- T10 check-out
  PERFORM public.check_out_reservation(v_r1, 350, NULL);
  v_res := v_res || jsonb_build_object('test','T10 check_out_reservation','result',
    CASE WHEN (SELECT status FROM public.reservations WHERE id=v_r1)='checked-out'
      AND (SELECT total_amount FROM public.reservations WHERE id=v_r1)=350
      AND NOT EXISTS (SELECT 1 FROM public.folios WHERE reservation_id=v_r1 AND status='open')
      THEN 'PASS' ELSE 'FAIL' END);

  -- T11 cancel checked-out must fail
  BEGIN
    PERFORM public.cancel_reservation(v_r1, 'nope', false);
    v_res := v_res || jsonb_build_object('test','T11 cancel of checked-out blocked','result','FAIL (allowed)');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T11 cancel of checked-out blocked','result','PASS','error',v_err);
  END;

  -- T12 cancel then rebook same room+dates
  PERFORM public.cancel_reservation(v_r3, 'guest called', false);
  BEGIN
    v_r2 := public.create_reservation(v_guest, v_room2, v_ci, v_co, 200);
    v_res := v_res || jsonb_build_object('test','T12 cancel then rebook same room/dates','result',
      CASE WHEN v_r2 IS NOT NULL THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T12 cancel then rebook same room/dates','result','FAIL','error',v_err);
  END;

  -- T13 checked-out reservation does not block a new booking on same room/dates
  BEGIN
    PERFORM public.create_reservation(v_guest, v_room, v_ci, v_co, 120, 'after checkout');
    v_res := v_res || jsonb_build_object('test','T13 checked-out does not conflict','result','PASS');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_res := v_res || jsonb_build_object('test','T13 checked-out does not conflict','result','FAIL','error',v_err);
  END;

  SELECT count(*) INTO v_audit_after FROM public.audit_log WHERE entity='reservation';
  v_res := v_res || jsonb_build_object('test','T14 audit entries created',
    'result', CASE WHEN v_audit_after - v_audit_before >= 6 THEN 'PASS' ELSE 'FAIL' END,
    'new_reservation_audit_rows', v_audit_after - v_audit_before,
    'sample', (SELECT jsonb_agg(jsonb_build_object('action',action,'user_id',user_id,'has_old',details->'old' IS NOT NULL,'has_new',details->'new' IS NOT NULL,'at',created_at))
               FROM (SELECT * FROM public.audit_log WHERE entity='reservation' ORDER BY created_at DESC LIMIT 5) s));

  -- cleanup
  DELETE FROM public.housekeeping_tasks WHERE room_id IN (v_room, v_room2) AND task_type='checkout-clean' AND status='pending';
  DELETE FROM public.folios WHERE reservation_id IN (SELECT id FROM public.reservations WHERE check_in = v_ci OR check_in = v_co);
  DELETE FROM public.reservations WHERE check_in >= current_date + 399;
  DELETE FROM public.rooms WHERE id = v_arch;
  UPDATE public.rooms SET status='available' WHERE id IN (v_room, v_room2);

  RETURN jsonb_build_object('tests', v_res);
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_reservation_rpc_tests() FROM public, anon, authenticated;