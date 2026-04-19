import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  cleaning: "bg-warning/15 text-warning-foreground border-warning/30",
  maintenance: "bg-destructive/10 text-destructive border-destructive/20",
  confirmed: "bg-info/10 text-info border-info/20",
  "checked-in": "bg-primary/10 text-primary border-primary/20",
  "checked-out": "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        style,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace("-", " ")}
    </span>
  );
}
