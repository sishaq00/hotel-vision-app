import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3 } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/availability")({
  component: () => (
    <PlaceholderPage
      title="Availability"
      subtitle="Grid view & floor plan — rooms × dates"
      icon={Grid3x3}
    />
  ),
});
