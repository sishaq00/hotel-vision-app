import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/batch-process")({
  component: () => (
    <PlaceholderPage
      title="Batch Process"
      subtitle="Auto-cancel No-Shows & bulk price updates"
      icon={Layers}
    />
  ),
});
