import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/reminders")({
  component: () => (
    <PlaceholderPage
      title="Reminders"
      subtitle="Tasks and follow-ups across the front desk"
      icon={Bell}
    />
  ),
});
