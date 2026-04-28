import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/bulk-routing/setup")({
  component: () => (
    <PlaceholderPage
      title="Bulk Routing Setup"
      subtitle="Define routing rules for charges across folios"
      icon={Receipt}
    />
  ),
});
