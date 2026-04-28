import { createFileRoute } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/night-audit")({
  component: () => (
    <PlaceholderPage
      title="Night Audit"
      subtitle="Daily closing wizard and audit reports"
      icon={Moon}
    />
  ),
});
