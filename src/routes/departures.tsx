import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/departures")({
  component: () => (
    <PlaceholderPage
      title="Departures"
      subtitle="Today's check-outs"
      icon={LogOut}
    />
  ),
});
