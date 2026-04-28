import { createFileRoute } from "@tanstack/react-router";
import { BedDouble } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/in-house")({
  component: () => (
    <PlaceholderPage
      title="In House"
      subtitle="Currently checked-in reservations"
      icon={BedDouble}
    />
  ),
});
