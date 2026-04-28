import { createFileRoute } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/archived-reservations")({
  component: () => (
    <PlaceholderPage
      title="Archived Reservations"
      subtitle="Soft-deleted and historical bookings"
      icon={Archive}
    />
  ),
});
