// Editable message templates (booking confirmation, check-out, reminder).
// Pure-frontend with localStorage. Variable interpolation via {{guest_name}} etc.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Save, MessageSquareText, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { useHotelStore } from "@/store/hotel-store";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Message Templates — NEXORA OS" },
      { name: "description", content: "Customizable email/SMS templates." },
    ],
  }),
  component: TemplatesPage,
});

interface TemplateSet {
  bookingSubject: string;
  bookingBody: string;
  checkoutSubject: string;
  checkoutBody: string;
  reminderSubject: string;
  reminderBody: string;
}

const STORAGE_KEY = "nexora.templates.v1";

const DEFAULTS: TemplateSet = {
  bookingSubject: "Booking confirmed — {{hotel_name}} #{{confirmation}}",
  bookingBody: `Dear {{guest_name}},

Your reservation at {{hotel_name}} is confirmed.

• Confirmation: {{confirmation}}
• Room: {{room_number}}
• Check-in:  {{check_in}}
• Check-out: {{check_out}}
• Total: {{currency}} {{total}}

We look forward to welcoming you.

— {{hotel_name}}`,
  checkoutSubject: "Thank you for staying — Invoice {{invoice_number}}",
  checkoutBody: `Dear {{guest_name}},

Thank you for your stay at {{hotel_name}}.

Your invoice {{invoice_number}} is attached.
Total paid: {{currency}} {{total}}

We hope to see you again soon.

— {{hotel_name}}`,
  reminderSubject: "Your stay starts tomorrow — {{hotel_name}}",
  reminderBody: `Hello {{guest_name}},

Just a friendly reminder that your stay at {{hotel_name}} starts on {{check_in}}.

Confirmation: {{confirmation}}
Room: {{room_number}}

Safe travels!`,
};

function loadTemplates(): TemplateSet {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const VARS = [
  "{{guest_name}}",
  "{{hotel_name}}",
  "{{confirmation}}",
  "{{room_number}}",
  "{{check_in}}",
  "{{check_out}}",
  "{{total}}",
  "{{currency}}",
  "{{invoice_number}}",
];

function TemplatesPage() {
  const settings = useHotelStore((s) => s.settings);
  const reservations = useHotelStore((s) => s.reservations);
  const guests = useHotelStore((s) => s.guests);
  const rooms = useHotelStore((s) => s.rooms);

  const [templates, setTemplates] = useState<TemplateSet>(DEFAULTS);
  const [previewResId, setPreviewResId] = useState<string>("");

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  // Sample data for preview: pick latest reservation if none selected.
  const sample = useMemo(() => {
    const r =
      reservations.find((x) => x.id === previewResId) ??
      [...reservations].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0];
    if (!r) {
      return {
        guest_name: "Jane Smith",
        hotel_name: settings.hotelName,
        confirmation: "ABC123",
        room_number: "101",
        check_in: new Date().toISOString().slice(0, 10),
        check_out: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        total: "350",
        currency: settings.currency,
        invoice_number: "INV-000001",
      };
    }
    const g = guests.find((x) => x.id === r.guestId);
    const rm = rooms.find((x) => x.id === r.roomId);
    return {
      guest_name: g?.name ?? "Guest",
      hotel_name: settings.hotelName,
      confirmation: r.confirmationNumber ?? r.id.slice(0, 6).toUpperCase(),
      room_number: rm?.number ?? "—",
      check_in: r.checkIn,
      check_out: r.checkOut,
      total: r.totalAmount.toFixed(2),
      currency: settings.currency,
      invoice_number: r.invoice?.invoiceNumber ?? "INV-PENDING",
    };
  }, [reservations, guests, rooms, settings, previewResId]);

  const interpolate = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k) => (sample as Record<string, string>)[k] ?? `{{${k}}}`);

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    toast.success("Templates saved");
  };

  const reset = () => {
    setTemplates(DEFAULTS);
    window.localStorage.removeItem(STORAGE_KEY);
    toast.success("Reset to defaults");
  };

  const copy = async (subject: string, body: string) => {
    const text = `Subject: ${interpolate(subject)}\n\n${interpolate(body)}`;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <AppLayout
      title="Message Templates"
      subtitle="Customize confirmation, check-out, and reminder messages"
    >
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Available variables:</span>
            {VARS.map((v) => (
              <code
                key={v}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
              >
                {v}
              </code>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={save}>
              <Save className="h-3.5 w-3.5" /> Save all
            </Button>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="booking">
            <TabsList>
              <TabsTrigger value="booking">Booking confirmation</TabsTrigger>
              <TabsTrigger value="checkout">Check-out / Invoice</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
            </TabsList>

            <TabsContent value="booking" className="space-y-3 pt-4">
              <Editor
                subject={templates.bookingSubject}
                body={templates.bookingBody}
                onSubject={(v) => setTemplates({ ...templates, bookingSubject: v })}
                onBody={(v) => setTemplates({ ...templates, bookingBody: v })}
                onCopy={() => copy(templates.bookingSubject, templates.bookingBody)}
                preview={{
                  subject: interpolate(templates.bookingSubject),
                  body: interpolate(templates.bookingBody),
                }}
              />
            </TabsContent>

            <TabsContent value="checkout" className="space-y-3 pt-4">
              <Editor
                subject={templates.checkoutSubject}
                body={templates.checkoutBody}
                onSubject={(v) => setTemplates({ ...templates, checkoutSubject: v })}
                onBody={(v) => setTemplates({ ...templates, checkoutBody: v })}
                onCopy={() => copy(templates.checkoutSubject, templates.checkoutBody)}
                preview={{
                  subject: interpolate(templates.checkoutSubject),
                  body: interpolate(templates.checkoutBody),
                }}
              />
            </TabsContent>

            <TabsContent value="reminder" className="space-y-3 pt-4">
              <Editor
                subject={templates.reminderSubject}
                body={templates.reminderBody}
                onSubject={(v) => setTemplates({ ...templates, reminderSubject: v })}
                onBody={(v) => setTemplates({ ...templates, reminderBody: v })}
                onCopy={() => copy(templates.reminderSubject, templates.reminderBody)}
                preview={{
                  subject: interpolate(templates.reminderSubject),
                  body: interpolate(templates.reminderBody),
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </AppLayout>
  );
}

function Editor({
  subject,
  body,
  onSubject,
  onBody,
  onCopy,
  preview,
}: {
  subject: string;
  body: string;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
  onCopy: () => void;
  preview: { subject: string; body: string };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => onSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea
            rows={14}
            value={body}
            onChange={(e) => onBody(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground">Live preview</Label>
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          <p className="font-semibold text-foreground">{preview.subject}</p>
          <hr className="my-2 border-border" />
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
            {preview.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
