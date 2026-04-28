import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/search-reservations")({
  component: () => (
    <PlaceholderPage
      title="Search Reservations"
      subtitle="Search by name, phone, confirmation, room number"
      icon={Search}
    />
  ),
});
