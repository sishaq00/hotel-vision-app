// Filter bar for the Housekeeping board.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HousekeepingStatus } from "@/store/hotel-store";

export interface FilterState {
  status: "all" | HousekeepingStatus | "assigned" | "unassigned";
  floor: string;
  building: string;
  zone: string;
  housekeeperId: string;
}

export function HousekeepingFilters({
  state,
  onChange,
  floors,
  buildings,
  zones,
  housekeepers,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
  floors: number[];
  buildings: string[];
  zones: string[];
  housekeepers: { id: string; name: string }[];
}) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={state.status} onValueChange={(v) => set("status", v as FilterState["status"])}>
        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="dirty">Dirty</SelectItem>
          <SelectItem value="departure">Departure (CO)</SelectItem>
          <SelectItem value="stayover">Stayover (SO)</SelectItem>
          <SelectItem value="clean">Clean</SelectItem>
          <SelectItem value="inspected">Inspected</SelectItem>
          <SelectItem value="out-of-order">Out of order</SelectItem>
          <SelectItem value="assigned">— Assigned</SelectItem>
          <SelectItem value="unassigned">— Unassigned</SelectItem>
        </SelectContent>
      </Select>

      <Select value={state.floor} onValueChange={(v) => set("floor", v)}>
        <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All floors</SelectItem>
          {floors.map((f) => (
            <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {buildings.length > 0 && (
        <Select value={state.building} onValueChange={(v) => set("building", v)}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All buildings</SelectItem>
            {buildings.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {zones.length > 0 && (
        <Select value={state.zone} onValueChange={(v) => set("zone", v)}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {housekeepers.length > 0 && (
        <Select value={state.housekeeperId} onValueChange={(v) => set("housekeeperId", v)}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All housekeepers</SelectItem>
            <SelectItem value="none">— Unassigned</SelectItem>
            {housekeepers.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
