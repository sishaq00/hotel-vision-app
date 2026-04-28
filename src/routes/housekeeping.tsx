import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/housekeeping")({
  component: () => (
    <PlaceholderPage
      title="Housekeeping"
      subtitle="Room status: dirty → clean → inspected → ready"
      icon={Sparkles}
    />
  ),
});
