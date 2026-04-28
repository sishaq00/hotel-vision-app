import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/group-master")({
  component: () => (
    <PlaceholderPage
      title="Group Master"
      subtitle="Group reservations with unified rate"
      icon={Users}
    />
  ),
});
