import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/product-inventory")({
  component: () => (
    <PlaceholderPage
      title="Product Inventory"
      subtitle="Minibar, spa, and resale products"
      icon={ShoppingBag}
    />
  ),
});
