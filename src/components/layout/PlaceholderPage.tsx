import { LucideIcon, Construction } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Card } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  description?: string;
}

export function PlaceholderPage({
  title,
  subtitle,
  icon: Icon = Construction,
  description = "This module is part of the upcoming roadmap. The data model is already in place — the dedicated UI will land in the next implementation phase.",
}: PlaceholderPageProps) {
  return (
    <AppLayout title={title} subtitle={subtitle}>
      <Card className="flex flex-col items-center justify-center gap-3 border-dashed border-border bg-muted/30 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>}
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </Card>
    </AppLayout>
  );
}
