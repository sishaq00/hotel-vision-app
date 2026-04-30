import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Tag, Save, DollarSign } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/room-types")({
  head: () => ({
    meta: [
      { title: "Room Types — NEXORA OS" },
      { name: "description", content: "Rename room types and bulk-edit prices." },
    ],
  }),
  component: RoomTypesPage,
});

function autoCode(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
}

interface TypeGroup {
  key: string;        // original type name (used to match rooms in store)
  type: string;       // editable name
  typeCode: string;   // editable code
  price: number;      // editable bulk price
  count: number;
  minPrice: number;
  maxPrice: number;
  mixedPrice: boolean;
}

function RoomTypesPage() {
  const { t } = useT();
  const rooms = useHotelStore((s) => s.rooms);
  const renameRoomType = useHotelStore((s) => s.renameRoomType);
  const setRoomTypePrice = useHotelStore((s) => s.setRoomTypePrice);

  const groups = useMemo<TypeGroup[]>(() => {
    const map = new Map<string, TypeGroup>();
    for (const r of rooms) {
      const g = map.get(r.type);
      if (!g) {
        map.set(r.type, {
          key: r.type,
          type: r.type,
          typeCode: r.typeCode,
          price: r.price,
          count: 1,
          minPrice: r.price,
          maxPrice: r.price,
          mixedPrice: false,
        });
      } else {
        g.count++;
        g.minPrice = Math.min(g.minPrice, r.price);
        g.maxPrice = Math.max(g.maxPrice, r.price);
        g.mixedPrice = g.minPrice !== g.maxPrice;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.type.localeCompare(b.type));
  }, [rooms]);

  // Local edit state keyed by original type name
  const [drafts, setDrafts] = useState<Record<string, TypeGroup>>({});

  // Sync drafts when underlying groups change (room added/removed/etc.)
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, TypeGroup> = {};
      for (const g of groups) {
        const existing = prev[g.key];
        next[g.key] = existing
          ? { ...g, type: existing.type, typeCode: existing.typeCode, price: existing.price }
          : { ...g };
      }
      return next;
    });
  }, [groups]);

  const updateDraft = (key: string, patch: Partial<TypeGroup>) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const saveRename = (key: string) => {
    const d = drafts[key];
    if (!d) return;
    if (!d.type.trim()) return toast.error("Type name is required");
    const code = (d.typeCode.trim() || autoCode(d.type)).toUpperCase();
    if (d.type === key && code === groups.find((g) => g.key === key)?.typeCode) {
      return toast("Nothing to save");
    }
    const n = renameRoomType(key, { type: d.type, typeCode: code });
    toast.success(`Updated ${n} room${n === 1 ? "" : "s"}`, {
      description: `${d.type} · ${code}`,
    });
  };

  const applyPrice = (key: string) => {
    const d = drafts[key];
    if (!d) return;
    if (!Number.isFinite(d.price) || d.price < 0) return toast.error("Invalid price");
    const n = setRoomTypePrice(key, d.price);
    toast.success(`Price applied to ${n} room${n === 1 ? "" : "s"}`, {
      description: `$${d.price} / night`,
    });
  };

  return (
    <AppLayout title={t("nav.room-types")} subtitle={t("sub.room-types")}>
      <div className="space-y-6">
        {groups.length === 0 ? (
          <Card className="border-border/60 shadow-card">
            <EmptyState
              icon={Tag}
              title="No room types yet"
              description="Add rooms first — they'll be grouped here by type."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groups.map((g) => {
              const d = drafts[g.key] ?? g;
              return (
                <Card key={g.key} className="border-border/60 p-5 shadow-card">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {g.type}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-primary">{g.typeCode}</span>
                        <span className="mx-1.5">·</span>
                        {g.count} room{g.count === 1 ? "" : "s"}
                        <span className="mx-1.5">·</span>
                        {g.mixedPrice
                          ? `$${g.minPrice}–$${g.maxPrice}`
                          : `$${g.minPrice}`}{" "}
                        / night
                      </p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                      {g.typeCode}
                    </span>
                  </div>

                  {/* Rename */}
                  <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Rename type
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor={`name-${g.key}`} className="text-xs">
                          Type name
                        </Label>
                        <Input
                          id={`name-${g.key}`}
                          value={d.type}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateDraft(g.key, {
                              type: v,
                              // auto-suggest code if user hasn't customised it from the original
                              typeCode:
                                d.typeCode === g.typeCode ? autoCode(v) : d.typeCode,
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`code-${g.key}`} className="text-xs">
                          Code
                        </Label>
                        <Input
                          id={`code-${g.key}`}
                          value={d.typeCode}
                          maxLength={6}
                          onChange={(e) =>
                            updateDraft(g.key, { typeCode: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => saveRename(g.key)}
                    >
                      <Save className="h-3.5 w-3.5" /> Save rename
                    </Button>
                  </div>

                  {/* Bulk price */}
                  <div className="mt-3 space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bulk price
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor={`price-${g.key}`} className="text-xs">
                        Price / night (USD)
                      </Label>
                      <Input
                        id={`price-${g.key}`}
                        type="number"
                        min={0}
                        value={d.price}
                        onChange={(e) =>
                          updateDraft(g.key, { price: Number(e.target.value) })
                        }
                      />
                      {g.mixedPrice && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Rooms currently have mixed prices (${g.minPrice}–${g.maxPrice}). Saving will overwrite all.
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full gap-2"
                      onClick={() => applyPrice(g.key)}
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Apply to {g.count} room
                      {g.count === 1 ? "" : "s"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
