import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/maintenance")({
  component: () => (
    <PlaceholderPage
      title="Maintenance"
      subtitle="Tickets, priorities, and assignment"
      icon={Wrench}
    />
  ),
});
