import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/recently-viewed")({
  component: () => (
    <PlaceholderPage
      title="Recently Viewed"
      subtitle="Last 20 reservations you opened"
      icon={Eye}
    />
  ),
});
