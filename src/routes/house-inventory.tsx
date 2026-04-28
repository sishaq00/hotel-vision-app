import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/house-inventory")({
  component: () => (
    <PlaceholderPage
      title="House Inventory"
      subtitle="Linens, amenities, cleaning supplies"
      icon={Package}
    />
  ),
});
