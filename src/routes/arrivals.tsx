import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/arrivals")({
  component: () => (
    <PlaceholderPage
      title="Arrivals"
      subtitle="Today's expected check-ins"
      icon={CalendarCheck}
    />
  ),
});
