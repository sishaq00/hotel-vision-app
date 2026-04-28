import { createFileRoute } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/search-invoice")({
  component: () => (
    <PlaceholderPage
      title="Search Invoice"
      subtitle="Find any past invoice by number, guest, or date"
      icon={FileSearch}
    />
  ),
});
