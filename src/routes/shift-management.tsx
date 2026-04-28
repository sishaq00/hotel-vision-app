import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/shift-management")({
  component: () => (
    <PlaceholderPage
      title="Shift Management"
      subtitle="Front desk shifts: open, close, cash drawer balancing"
      icon={Clock}
    />
  ),
});
