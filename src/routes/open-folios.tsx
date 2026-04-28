import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/open-folios")({
  component: () => (
    <PlaceholderPage
      title="Open Folios"
      subtitle="Active folios for in-house guests"
      icon={FolderOpen}
    />
  ),
});
