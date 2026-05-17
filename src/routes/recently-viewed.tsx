import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { History } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { useHotelStore } from "@/store/hotel-store";

export const Route = createFileRoute("/recently-viewed")({
  head: () => ({
    meta: [
      { title: "Recently Viewed — NEXORA OS" },
      { name: "description", content: "Last reservations you opened." },
    ],
  }),
  component: RecentlyViewedPage,
});

function RecentlyViewedPage() {
  const reservations = useHotelStore((s) => s.reservations);

  const list = useMemo(() => {
    return reservations
      .filter((r) => !!r.recentlyViewedAt)
      .sort((a, b) =>
        (b.recentlyViewedAt ?? "") > (a.recentlyViewedAt ?? "") ? 1 : -1,
      )
      .slice(0, 20);
  }, [reservations]);

  return (
    <AppLayout
      title="Recently Viewed"
      subtitle={`Last ${list.length} reservation${list.length === 1 ? "" : "s"} opened`}
    >
      <Card className="border-border/60 shadow-card">
        {list.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recently viewed reservations"
            description="Click any reservation row across the system and it will appear here."
          />
        ) : (
          <ReservationsTable
            reservations={list}
            extraColumn={{
              header: "Last viewed",
              render: (r) => (
                <span className="text-xs text-muted-foreground">
                  {r.recentlyViewedAt
                    ? new Date(r.recentlyViewedAt).toLocaleString()
                    : "—"}
                </span>
              ),
            }}
          />
        )}
      </Card>
    </AppLayout>
  );
}
