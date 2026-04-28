import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/report-queue")({
  component: () => (
    <PlaceholderPage
      title="Report Queue"
      subtitle="Scheduled reports and run history"
      icon={ListChecks}
    />
  ),
});
