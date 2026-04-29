import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore, type ReminderPriority } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — NEXORA OS" },
      { name: "description", content: "Front desk reminders and follow-ups." },
    ],
  }),
  component: RemindersPage,
});

const PRIORITY_STYLE: Record<ReminderPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/10 text-info border-info/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

function RemindersPage() {
  const reminders = useHotelStore((s) => s.reminders);
  const addReminder = useHotelStore((s) => s.addReminder);
  const toggle = useHotelStore((s) => s.toggleReminder);
  const remove = useHotelStore((s) => s.deleteReminder);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");

  const list = useMemo(() => {
    return [...reminders]
      .filter((r) =>
        filter === "all" ? true : filter === "done" ? r.done : !r.done,
      )
      .sort((a, b) => (a.dueAt > b.dueAt ? 1 : -1));
  }, [reminders, filter]);

  return (
    <AppLayout
      title="Reminders"
      subtitle={`${reminders.filter((r) => !r.done).length} open reminder${
        reminders.filter((r) => !r.done).length === 1 ? "" : "s"
      }`}
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex gap-2">
            {(["open", "done", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New reminder
              </Button>
            </DialogTrigger>
            <NewReminderDialog
              onSubmit={(d) => {
                addReminder(d);
                toast.success("Reminder added");
                setOpen(false);
              }}
            />
          </Dialog>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No reminders"
            description="Create a reminder for follow-ups, special requests, or VIP arrivals."
          />
        ) : (
          <div className="divide-y divide-border">
            {list.map((r) => {
              const overdue = !r.done && new Date(r.dueAt) < new Date();
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/30"
                >
                  <Checkbox
                    checked={r.done}
                    onCheckedChange={() => toggle(r.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          r.done
                            ? "line-through text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {r.title}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          PRIORITY_STYLE[r.priority],
                        )}
                      >
                        {r.priority}
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          overdue ? "text-destructive font-medium" : "text-muted-foreground",
                        )}
                      >
                        {overdue ? "Overdue · " : ""}
                        {new Date(r.dueAt).toLocaleString()}
                      </span>
                    </div>
                    {r.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      remove(r.id);
                      toast("Reminder deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function NewReminderDialog({
  onSubmit,
}: {
  onSubmit: (d: {
    title: string;
    description?: string;
    dueAt: string;
    priority: ReminderPriority;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [priority, setPriority] = useState<ReminderPriority>("medium");

  return (
    <DialogContent className="sm:max-w-[450px]">
      <DialogHeader>
        <DialogTitle>New reminder</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Call airport for VIP pickup"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Due</Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as ReminderPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            if (!title.trim()) {
              toast.error("Title required");
              return;
            }
            onSubmit({
              title: title.trim(),
              description: description.trim() || undefined,
              dueAt: new Date(dueAt).toISOString(),
              priority,
            });
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
