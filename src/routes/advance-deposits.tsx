import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/advance-deposits")({
  component: () => (
    <PlaceholderPage
      title="Advance Deposits"
      subtitle="Held, applied and refunded deposits"
      icon={CreditCard}
    />
  ),
});
