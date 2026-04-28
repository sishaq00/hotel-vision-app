import { createFileRoute } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/lost-found")({
  component: () => (
    <PlaceholderPage
      title="Lost and Found"
      subtitle="Track items found by guests or staff"
      icon={PackageSearch}
    />
  ),
});
