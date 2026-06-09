
CREATE OR REPLACE FUNCTION public.run_full_hotel_simulation(p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest uuid; v_room uuid; v_res uuid; v_folio uuid;
  v_payment uuid; v_hk_task uuid; v_mt uuid; v_shift uuid;
  v_hk uuid; v_audit_before int; v_audit_after int;
  v_log jsonb := '[]'::jsonb;
BEGIN
  -- Impersonate caller for is_staff() inside nested RPCs
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_actor::text, 'role','authenticated')::text, true);

  SELECT count(*) INTO v_audit_before FROM audit_log;

  -- 1) Guest
  INSERT INTO guests(name,email,phone,country)
  VALUES ('Simulation Guest','sim+'||extract(epoch from now())::bigint||'@test.local','+10000000','US')
  RETURNING id INTO v_guest;
  v_log := v_log || jsonb_build_object('step','1_create_guest','table','guests','id',v_guest);

  -- 2) Room (pick available)
  SELECT id INTO v_room FROM rooms
   WHERE status='available' AND COALESCE(archived,false)=false
   ORDER BY number LIMIT 1;
  v_log := v_log || jsonb_build_object('step','2_assign_room','table','rooms','id',v_room);

  -- 3) Reservation (confirmed)
  INSERT INTO reservations(guest_id,room_id,check_in,check_out,status,total_amount,nights,rate_per_night,source)
  VALUES (v_guest, v_room, CURRENT_DATE, CURRENT_DATE+2, 'confirmed', 200, 2, 100, 'walk-in')
  RETURNING id INTO v_res;
  v_log := v_log || jsonb_build_object('step','3_create_reservation','table','reservations','id',v_res);

  -- 4) Check-in via RPC (creates folio)
  v_folio := public.check_in_reservation(v_res);
  v_log := v_log || jsonb_build_object('step','4_check_in','rpc','check_in_reservation',
                                       'folio_id',v_folio,'tables',ARRAY['reservations','rooms','folios']);

  -- 5) Folio charges
  INSERT INTO folio_charges(folio_id,description,amount,category,posted_by)
    VALUES (v_folio,'Room night 1',100,'room',p_actor);
  INSERT INTO folio_charges(folio_id,description,amount,category,posted_by)
    VALUES (v_folio,'Room night 2',100,'room',p_actor);
  INSERT INTO folio_charges(folio_id,description,amount,category,posted_by)
    VALUES (v_folio,'Minibar',15,'fnb',p_actor);
  v_log := v_log || jsonb_build_object('step','5_add_charges','table','folio_charges','count',3,'total',215);

  -- 6) Cash payment via RPC
  v_payment := public.record_payment_with_audit(v_res, v_guest, 215, 'cash','paid','Full cash settlement');
  v_log := v_log || jsonb_build_object('step','6_record_cash_payment','rpc','record_payment_with_audit',
                                       'payment_id',v_payment,'method','cash','amount',215);

  -- 7) Housekeeping assignment
  INSERT INTO housekeepers(name,source,active) VALUES ('Sim Housekeeper','manual',true)
    ON CONFLICT DO NOTHING;
  SELECT id INTO v_hk FROM housekeepers WHERE name='Sim Housekeeper' LIMIT 1;
  v_hk_task := public.assign_housekeeping_task(v_room, v_hk, 'standard-clean');
  v_log := v_log || jsonb_build_object('step','7_assign_housekeeping','rpc','assign_housekeeping_task',
                                       'task_id',v_hk_task,'housekeeper_id',v_hk);

  -- 8) Complete housekeeping (cleaning -> inspected)
  PERFORM public.update_room_housekeeping_status(v_room,'cleaning');
  PERFORM public.update_room_housekeeping_status(v_room,'clean');
  PERFORM public.update_room_housekeeping_status(v_room,'inspected');
  v_log := v_log || jsonb_build_object('step','8_complete_housekeeping','rpc','update_room_housekeeping_status',
                                       'final_status','inspected');

  -- 9) Maintenance ticket
  INSERT INTO maintenance_tickets(room_id,title,description,priority,status,reported_by)
  VALUES (v_room,'AC noisy','Compressor rattle','medium','open',p_actor)
  RETURNING id INTO v_mt;
  PERFORM public.assign_maintenance_ticket(v_mt, p_actor);
  v_log := v_log || jsonb_build_object('step','9_create_maintenance','table','maintenance_tickets','id',v_mt);

  -- 10) Complete maintenance
  PERFORM public.complete_maintenance_ticket(v_mt,'Replaced fan, tested OK');
  v_log := v_log || jsonb_build_object('step','10_complete_maintenance','rpc','complete_maintenance_ticket');

  -- 11) Check-out via RPC
  PERFORM public.check_out_reservation(v_res, 215);
  v_log := v_log || jsonb_build_object('step','11_check_out','rpc','check_out_reservation',
                                       'tables',ARRAY['reservations','folios','rooms','housekeeping_tasks']);

  -- 12) Receipt / invoice JSON on reservation
  UPDATE reservations
     SET invoice = jsonb_build_object('number','SIM-'||to_char(now(),'YYYYMMDDHH24MISS'),
                                      'total',215,'method','cash','issued_at',now())
   WHERE id = v_res;
  v_log := v_log || jsonb_build_object('step','12_generate_receipt','table','reservations.invoice');

  -- 13) Open + close shift
  INSERT INTO shifts(user_id,opened_at,opening_balance,status)
  VALUES (p_actor, now()-interval '8 hours', 100, 'open') RETURNING id INTO v_shift;
  UPDATE shifts SET closed_at=now(), closing_balance=100+215, status='closed',
         notes='Simulation close — cash drawer reconciled'
   WHERE id = v_shift;
  v_log := v_log || jsonb_build_object('step','13_close_shift','table','shifts','id',v_shift,
                                       'cash_in',215,'closing_balance',315);

  SELECT count(*) INTO v_audit_after FROM audit_log;

  RETURN jsonb_build_object(
    'ok',true,
    'context',jsonb_build_object(
      'guest_id',v_guest,'room_id',v_room,'reservation_id',v_res,
      'folio_id',v_folio,'payment_id',v_payment,'hk_task_id',v_hk_task,
      'maintenance_id',v_mt,'shift_id',v_shift),
    'steps',v_log,
    'audit_log_delta', v_audit_after - v_audit_before
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_full_hotel_simulation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_full_hotel_simulation(uuid) TO service_role;
