// NEXORA OS — First-run onboarding wizard.
// Shown once after the admin logs in for the first time (setupComplete === false).
// 5 steps: Welcome → Hotel Info → Financials → Rooms → Done
import { useState, useCallback } from "react";
import {
  Hotel, DollarSign, BedDouble, CheckCircle2,
  ChevronRight, ChevronLeft, Sparkles, Plus, Trash2,
  Globe, Phone, Mail, MapPin, Hash, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHotelStore } from "@/store/hotel-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomTemplate {
  id: string;
  type: string;
  typeCode: string;
  count: number;
  floor: number;
  price: number;
  startNumber: string;
}

interface HotelInfo {
  hotelName: string;
  hotelCode: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}

interface FinancialInfo {
  currency: string;
  taxRate: number;
  serviceFeeRate: number;
  invoicePrefix: string;
  taxId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "USD", symbol: "$",   label: "US Dollar"        },
  { code: "EUR", symbol: "€",   label: "Euro"             },
  { code: "GBP", symbol: "£",   label: "British Pound"    },
  { code: "SAR", symbol: "SAR", label: "Saudi Riyal"      },
  { code: "AED", symbol: "AED", label: "UAE Dirham"       },
  { code: "KWD", symbol: "KWD", label: "Kuwaiti Dinar"    },
  { code: "QAR", symbol: "QAR", label: "Qatari Riyal"     },
  { code: "BHD", symbol: "BHD", label: "Bahraini Dinar"   },
  { code: "OMR", symbol: "OMR", label: "Omani Rial"       },
  { code: "JOD", symbol: "JOD", label: "Jordanian Dinar"  },
  { code: "EGP", symbol: "EGP", label: "Egyptian Pound"   },
  { code: "MAD", symbol: "MAD", label: "Moroccan Dirham"  },
  { code: "TRY", symbol: "TL",  label: "Turkish Lira"     },
  { code: "INR", symbol: "₹",  label: "Indian Rupee"     },
  { code: "SGD", symbol: "S$",  label: "Singapore Dollar" },
  { code: "THB", symbol: "฿",  label: "Thai Baht"        },
];

const STEPS = [
  { key: "welcome",    label: "Welcome",    icon: Sparkles    },
  { key: "hotel",      label: "Hotel Info", icon: Hotel       },
  { key: "financials", label: "Financials", icon: DollarSign  },
  { key: "rooms",      label: "Rooms",      icon: BedDouble   },
  { key: "done",       label: "Done",       icon: CheckCircle2 },
] as const;

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done   = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
              done   && "border-primary bg-primary text-primary-foreground",
              active && "border-primary bg-primary/10 text-primary",
              !done && !active && "border-border bg-card text-muted-foreground",
            )}>
              {done
                ? <CheckCircle2 className="h-4 w-4" />
                : <Icon className="h-3.5 w-3.5" />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 w-6 rounded-full transition-all",
                done ? "bg-primary" : "bg-border",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
        <Hotel className="h-10 w-10 text-primary-foreground" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-foreground">Welcome to NEXORA OS</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        A complete hotel management system. Let's set up your property in under
        2 minutes — you can change everything later in Settings.
      </p>

      <div className="mt-8 grid w-full max-w-sm gap-3 text-left">
        {[
          { icon: Hotel,      label: "Unlimited rooms",          sub: "Any size hotel — configure every floor and room type" },
          { icon: BedDouble,  label: "Reservations & check-ins", sub: "Full front-desk operations from day one"              },
          { icon: DollarSign, label: "Invoices & payments",      sub: "Automatic invoice generation with VAT & service fee"  },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="mt-8 gap-2 px-8">
        Get started <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Step 1: Hotel Info ───────────────────────────────────────────────────────

function StepHotelInfo({
  data, onChange, onNext, onBack,
}: { data: HotelInfo; onChange: (d: HotelInfo) => void; onNext: () => void; onBack: () => void }) {
  const set = (k: keyof HotelInfo) =>
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...data, [k]: e.target.value });

  const handleNext = () => {
    if (!data.hotelName.trim()) { toast.error("Hotel name is required"); return; }
    onNext();
  };

  const autoCode = () => {
    const code = data.hotelName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 5);
    onChange({ ...data, hotelCode: code });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Hotel Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">This appears on all invoices and reports.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="hotelName">Hotel name <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Hotel className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="hotelName" value={data.hotelName} onChange={set("hotelName")}
              className="pl-9" placeholder="Grand Palace Hotel" autoFocus />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="hotelCode">Hotel code</Label>
            <button type="button" onClick={autoCode} className="text-[11px] text-primary hover:underline">
              Auto-generate
            </button>
          </div>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="hotelCode" value={data.hotelCode} onChange={set("hotelCode")}
              className="pl-9 font-mono uppercase" placeholder="GRPLT" maxLength={6} />
          </div>
          <p className="text-[11px] text-muted-foreground">3–5 letter code shown in the sidebar</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Contact email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="contactEmail" type="email" value={data.contactEmail}
              onChange={set("contactEmail")} className="pl-9" placeholder="info@hotel.com" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">Phone</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="contactPhone" value={data.contactPhone} onChange={set("contactPhone")}
              className="pl-9" placeholder="+1 555 000 0000" />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="address" value={data.address} onChange={set("address")}
              className="pl-9" placeholder="123 Main Street, City, Country" />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Financials ───────────────────────────────────────────────────────

function StepFinancials({
  data, onChange, onNext, onBack,
}: { data: FinancialInfo; onChange: (d: FinancialInfo) => void; onNext: () => void; onBack: () => void }) {
  const selectedCurrency = CURRENCIES.find((c) => c.code === data.currency);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Financial Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Applied to every invoice. You can update these in Settings later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Currency</Label>
          <Select value={data.currency} onValueChange={(v) => onChange({ ...data, currency: v })}>
            <SelectTrigger>
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="font-mono">{c.symbol}</span>
                  <span className="ml-2">{c.label}</span>
                  <span className="ml-1 text-muted-foreground">({c.code})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxRate">VAT / Tax rate</Label>
          <div className="relative">
            <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="taxRate" type="number" min="0" max="100" step="0.5"
              value={Math.round(data.taxRate * 100)}
              onChange={(e) => onChange({ ...data, taxRate: Number(e.target.value) / 100 })}
              className="pl-9" placeholder="15" />
          </div>
          <p className="text-[11px] text-muted-foreground">Enter 0 for tax-exempt</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serviceFee">Service fee</Label>
          <div className="relative">
            <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="serviceFee" type="number" min="0" max="100" step="0.5"
              value={Math.round(data.serviceFeeRate * 100)}
              onChange={(e) => onChange({ ...data, serviceFeeRate: Number(e.target.value) / 100 })}
              className="pl-9" placeholder="10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invPrefix">Invoice prefix</Label>
          <Input id="invPrefix" value={data.invoicePrefix}
            onChange={(e) => onChange({ ...data, invoicePrefix: e.target.value.toUpperCase() })}
            className="font-mono uppercase" placeholder="INV" maxLength={8} />
          <p className="text-[11px] text-muted-foreground">
            e.g. INV → <span className="font-mono">INV-2024-000001</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxId">VAT registration # (optional)</Label>
          <Input id="taxId" value={data.taxId}
            onChange={(e) => onChange({ ...data, taxId: e.target.value })}
            placeholder="Optional" />
        </div>
      </div>

      {/* Live invoice preview */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Invoice preview — 1 night at 100
        </p>
        <div className="flex justify-between text-muted-foreground">
          <span>Room rate</span>
          <span>{selectedCurrency?.symbol} 100.00</span>
        </div>
        {data.taxRate > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>VAT ({(data.taxRate * 100).toFixed(1)}%)</span>
            <span>{selectedCurrency?.symbol} {(100 * data.taxRate).toFixed(2)}</span>
          </div>
        )}
        {data.serviceFeeRate > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Service fee ({(data.serviceFeeRate * 100).toFixed(1)}%)</span>
            <span>{selectedCurrency?.symbol} {(100 * data.serviceFeeRate).toFixed(2)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
          <span>Total</span>
          <span>
            {selectedCurrency?.symbol} {(100 * (1 + data.taxRate + data.serviceFeeRate)).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Rooms ────────────────────────────────────────────────────────────

function StepRooms({
  templates, onChange, onNext, onBack,
}: {
  templates: RoomTemplate[];
  onChange: (t: RoomTemplate[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const addTemplate = () => {
    const id = Math.random().toString(36).slice(2);
    onChange([...templates, { id, type: "", typeCode: "", count: 5, floor: 1, price: 150, startNumber: "101" }]);
  };

  const update = (id: string, patch: Partial<RoomTemplate>) =>
    onChange(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remove = (id: string) => onChange(templates.filter((t) => t.id !== id));

  const totalRooms = templates.reduce((s, t) => s + (t.count || 0), 0);

  const handleNext = () => {
    if (templates.length > 0) {
      const bad = templates.find((t) => !t.type.trim() || t.count < 1 || t.price < 1);
      if (bad) { toast.error("Fill in name, count and price for every room type"); return; }
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Add Your Rooms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define room types and NEXORA creates all rooms automatically.
          You can always add more from the Rooms page.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-10 text-center">
          <BedDouble className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No room types added yet</p>
          <p className="text-xs text-muted-foreground">Click the button below to add your first room type</p>
        </div>
      ) : (
        <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
          {templates.map((t, idx) => (
            <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Room type {idx + 1}
                </p>
                <button type="button" onClick={() => remove(t.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Room type name</Label>
                  <Input value={t.type} placeholder="Deluxe King, Standard Twin…"
                    onChange={(e) => {
                      const type = e.target.value;
                      const code = type.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4);
                      update(t.id, { type, typeCode: t.typeCode || code });
                    }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Short code</Label>
                  <Input value={t.typeCode} placeholder="DLX" maxLength={4}
                    className="font-mono uppercase"
                    onChange={(e) => update(t.id, { typeCode: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Number of rooms</Label>
                  <Input type="number" min="1" max="500" value={t.count}
                    onChange={(e) => update(t.id, { count: Math.max(1, +e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Starting floor</Label>
                  <Input type="number" min="1" max="100" value={t.floor}
                    onChange={(e) => update(t.id, { floor: Math.max(1, +e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price / night</Label>
                  <Input type="number" min="1" value={t.price}
                    onChange={(e) => update(t.id, { price: Math.max(1, +e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First room number</Label>
                  <Input value={t.startNumber} placeholder="101"
                    onChange={(e) => update(t.id, { startNumber: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={addTemplate}
        className="w-full gap-2 border-dashed">
        <Plus className="h-4 w-4" /> Add room type
      </Button>

      {totalRooms > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            ✓ {totalRooms} room{totalRooms !== 1 ? "s" : ""} will be created
            across {templates.length} type{templates.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} className="gap-1">
          {templates.length === 0 ? "Skip for now" : "Create rooms & continue"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone({
  hotelName, roomCount, onFinish,
}: { hotelName: string; roomCount: number; onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
        <CheckCircle2 className="h-10 w-10 text-white" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-foreground">
        {hotelName || "Your hotel"} is ready!
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {roomCount > 0
          ? `${roomCount} room${roomCount !== 1 ? "s" : ""} created and ready to book. `
          : ""}
        You can now start taking reservations.
      </p>

      <div className="mt-8 grid w-full max-w-sm gap-3 text-left">
        {[
          { label: "Dashboard",       desc: "Occupancy, arrivals, revenue KPIs"   },
          { label: "Add reservation", desc: "Check in your first guest"            },
          { label: "Settings",        desc: "Logo, invoice footer, tax ID and more"},
        ].map(({ label, desc }) => (
          <div key={label}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>

      <Button onClick={onFinish} size="lg" className="mt-8 gap-2 px-10 shadow-lg">
        <Sparkles className="h-4 w-4" />
        Open Dashboard
      </Button>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const updateSettings = useHotelStore((s) => s.updateSettings);
  const addRoom        = useHotelStore((s) => s.addRoom);
  const completeSetup  = useHotelStore((s) => s.completeSetup);

  const [step, setStep] = useState(0);

  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
    hotelName: "", hotelCode: "", address: "", contactEmail: "", contactPhone: "",
  });

  const [financial, setFinancial] = useState<FinancialInfo>({
    currency: "USD", taxRate: 0.15, serviceFeeRate: 0.10,
    invoicePrefix: "INV", taxId: "",
  });

  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([]);

  const next = useCallback(() => setStep((s) => s + 1), []);
  const back = useCallback(() => setStep((s) => s - 1), []);

  const handleFinish = useCallback(() => {
    // 1. Save settings
    updateSettings({
      hotelName:      hotelInfo.hotelName || "My Hotel",
      hotelCode:      hotelInfo.hotelCode || "HTL",
      address:        hotelInfo.address,
      contactEmail:   hotelInfo.contactEmail,
      contactPhone:   hotelInfo.contactPhone,
      currency:       financial.currency,
      taxRate:        financial.taxRate,
      serviceFeeRate: financial.serviceFeeRate,
      invoicePrefix:  financial.invoicePrefix || "INV",
      ...(financial.taxId ? { taxId: financial.taxId } : {}),
    });

    // 2. Create rooms from templates
    let created = 0;
    const ROOMS_PER_FLOOR = 10;
    for (const t of roomTemplates) {
      if (!t.type.trim() || t.count < 1) continue;
      const startNum = parseInt(t.startNumber, 10) || (t.floor * 100 + 1);
      for (let i = 0; i < t.count; i++) {
        addRoom({
          number:             String(startNum + i),
          type:               t.type,
          typeCode:           t.typeCode,
          floor:              t.floor + Math.floor(i / ROOMS_PER_FLOOR),
          price:              t.price,
          status:             "available",
          housekeepingStatus: "clean",
          smokingAllowed:     false,
          accessible:         false,
        });
        created++;
      }
    }

    // 3. Mark setup done
    completeSetup();

    toast.success("Setup complete!", {
      description: `${hotelInfo.hotelName || "Hotel"} is ready${created > 0 ? ` · ${created} rooms created` : ""}`,
    });
  }, [hotelInfo, financial, roomTemplates, updateSettings, addRoom, completeSetup]);

  const totalRooms = roomTemplates.reduce((s, t) => s + (t.count || 0), 0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-background via-muted/20 to-background px-4 py-8 md:justify-center">
      <div className="w-full max-w-xl">

        {/* Branding */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Hotel className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">NEXORA OS</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Hotel Management System</p>
        </div>

        {/* Step bar */}
        <div className="mb-6">
          <StepBar current={step} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length} — {STEPS[step].label}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl">
          <div className="p-6 md:p-8">
            {step === 0 && <StepWelcome onNext={next} />}
            {step === 1 && (
              <StepHotelInfo data={hotelInfo} onChange={setHotelInfo} onNext={next} onBack={back} />
            )}
            {step === 2 && (
              <StepFinancials data={financial} onChange={setFinancial} onNext={next} onBack={back} />
            )}
            {step === 3 && (
              <StepRooms templates={roomTemplates} onChange={setRoomTemplates} onNext={next} onBack={back} />
            )}
            {step === 4 && (
              <StepDone hotelName={hotelInfo.hotelName} roomCount={totalRooms} onFinish={handleFinish} />
            )}
          </div>
        </div>

        {/* Skip all */}
        {step > 0 && step < 4 && (
          <button type="button" onClick={() => setStep(4)}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip setup — go straight to dashboard →
          </button>
        )}
      </div>
    </div>
  );
}
