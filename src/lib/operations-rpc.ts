// Phase 3 — Atomic operations RPCs (housekeeping, maintenance, lost & found).
// All functions are SECURITY DEFINER on the server, staff-only, and produce
// audit_log entries via the global trigger. UI components should prefer these
// over raw table updates to guarantee atomicity + audit coverage.

import { supabase } from "@/integrations/supabase/client";

export type HousekeepingStatus = "dirty" | "cleaning" | "clean" | "inspected";

/** Assign a room to a housekeeper. Creates or reuses an open task. */
export async function assignHousekeepingTask(
  roomId: string,
  housekeeperId: string,
  taskType: string = "standard-clean",
): Promise<string> {
  const { data, error } = await supabase.rpc("assign_housekeeping_task", {
    p_room_id: roomId,
    p_housekeeper_id: housekeeperId,
    p_task_type: taskType,
  });
  if (error) throw error;
  return data as string;
}

/** Set a room's housekeeping status; auto-closes the open task on clean/inspected. */
export async function setRoomHousekeepingStatus(
  roomId: string,
  status: HousekeepingStatus,
): Promise<void> {
  const { error } = await supabase.rpc("update_room_housekeeping_status", {
    p_room_id: roomId,
    p_status: status,
  });
  if (error) throw error;
}

/** Assign a technician to a maintenance ticket (moves open → in-progress). */
export async function assignMaintenanceTicket(
  ticketId: string,
  technicianId: string,
): Promise<void> {
  const { error } = await supabase.rpc("assign_maintenance_ticket", {
    p_ticket_id: ticketId,
    p_technician_id: technicianId,
  });
  if (error) throw error;
}

/** Mark a ticket completed; appends an optional resolution note. */
export async function completeMaintenanceTicket(
  ticketId: string,
  resolutionNotes?: string,
): Promise<void> {
  const { error } = await supabase.rpc("complete_maintenance_ticket", {
    p_ticket_id: ticketId,
    p_resolution_notes: resolutionNotes ?? null,
  });
  if (error) throw error;
}

/** Record the physical storage location of a lost-and-found item. */
export async function setLostFoundLocation(
  itemId: string,
  location: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_lost_found_location", {
    p_item_id: itemId,
    p_location: location,
  });
  if (error) throw error;
}

/** Mark a lost-and-found item as returned to a specific guest. */
export async function returnLostFoundItem(
  itemId: string,
  guestId: string,
): Promise<void> {
  const { error } = await supabase.rpc("return_lost_found_item", {
    p_item_id: itemId,
    p_guest_id: guestId,
  });
  if (error) throw error;
}
