import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/house-accounts")({
  component: () => (
    <PlaceholderPage
      title="House Accounts"
      subtitle="Internal accounts: staff, owner, promotional"
      icon={Wallet}
    />
  ),
});
