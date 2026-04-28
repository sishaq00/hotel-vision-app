import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/bulk-routing/fast-posting")({
  component: () => (
    <PlaceholderPage
      title="Fast Posting"
      subtitle="Quickly post charges across multiple rooms"
      icon={Zap}
    />
  ),
});
