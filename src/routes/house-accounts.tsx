import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/house-accounts")({
  head: () => ({
    meta: [
      { title: "House Accounts — NEXORA OS" },
      { name: "description", content: "Internal accounts: staff, owner, promotional." },
    ],
  }),
  component: HouseAccountsPage,
});

function HouseAccountsPage() {
  const { t } = useT();
  const accounts = useHotelStore((s) => s.houseAccounts);
  const settings = useHotelStore((s) => s.settings);
  const add = useHotelStore((s) => s.addHouseAccount);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout title={t("nav.house-accounts")} subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}>
      <Card className="border-border/60 shadow-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold">Internal accounts</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New account</Button>
            </DialogTrigger>
            <NewAccountDialog onSubmit={(a) => { add(a); toast.success("Account created"); setOpen(false); }} />
          </Dialog>
        </div>
        {accounts.length === 0 ? (
          <EmptyState icon={Wallet} title="No house accounts" description="Track internal accounts for staff meals, owner, or promotional usage." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono">{settings.currency} {a.balance.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground line-clamp-1">{a.notes ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}

function NewAccountDialog({ onSubmit }: { onSubmit: (a: { name: string; notes?: string }) => void }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader><DialogTitle>New house account</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Staff Meals" /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          if (!name.trim()) { toast.error("Name required"); return; }
          onSubmit({ name: name.trim(), notes: notes.trim() || undefined });
        }}>Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}
