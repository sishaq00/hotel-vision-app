import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useHotelStore, type Guest, type GuestIdType } from "@/store/hotel-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestId?: string; // when undefined → create mode
}

const ID_TYPES: { value: GuestIdType; label: string }[] = [
  { value: "passport", label: "Passport" },
  { value: "national-id", label: "National ID" },
  { value: "driver-license", label: "Driver License" },
  { value: "other", label: "Other" },
];

export function EditGuestDialog({ open, onOpenChange, guestId }: Props) {
  const guest = useHotelStore((s) =>
    guestId ? s.guests.find((g) => g.id === guestId) : undefined,
  );
  const addGuest = useHotelStore((s) => s.addGuest);
  const updateGuest = useHotelStore((s) => s.updateGuest);

  const [form, setForm] = useState<Partial<Guest>>(() => guest ?? {});
  const [tagInput, setTagInput] = useState("");
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(
        guest ?? {
          name: "",
          email: "",
          phone: "",
          country: "",
          tags: [],
          preferences: {},
        },
      );
      setTagInput("");
    }
  }, [open, guest]);

  const set = <K extends keyof Guest>(key: K, value: Guest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPref = <K extends keyof NonNullable<Guest["preferences"]>>(
    key: K,
    value: NonNullable<Guest["preferences"]>[K],
  ) =>
    setForm((f) => ({
      ...f,
      preferences: { ...(f.preferences ?? {}), [key]: value },
    }));

  const onPhoto = (file: File, kind: "id" | "profile") => {
    if (file.size > 1024 * 1024) {
      toast.error("Image must be under 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (kind === "id") set("idPhotoDataUrl", url);
      else set("profilePhotoDataUrl", url);
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    const tags = Array.from(new Set([...(form.tags ?? []), v]));
    set("tags", tags);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    set("tags", (form.tags ?? []).filter((t) => t !== tag));

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email ?? "",
      phone: form.phone ?? "",
      country: form.country ?? "",
      vip: form.vip ?? false,
      doNotRent: form.doNotRent ?? false,
      notes: form.notes,
      nationality: form.nationality,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      address: form.address,
      city: form.city,
      postalCode: form.postalCode,
      idType: form.idType,
      idNumber: form.idNumber,
      idIssuedBy: form.idIssuedBy,
      idExpiry: form.idExpiry,
      idPhotoDataUrl: form.idPhotoDataUrl,
      profilePhotoDataUrl: form.profilePhotoDataUrl,
      preferences: form.preferences,
      tags: form.tags,
      company: form.company,
      loyaltyNumber: form.loyaltyNumber,
    };
    if (guestId) {
      updateGuest(guestId, payload);
      toast.success("Guest updated");
    } else {
      addGuest(payload);
      toast.success("Guest added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guestId ? "Edit Guest" : "Add New Guest"}</DialogTitle>
          <DialogDescription>
            Manage personal info, ID document, and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="id">ID Document</TabsTrigger>
            <TabsTrigger value="prefs">Preferences</TabsTrigger>
            <TabsTrigger value="flags">Flags & Tags</TabsTrigger>
          </TabsList>

          {/* Personal */}
          <TabsContent value="personal" className="space-y-4 pt-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div
                  className="relative h-24 w-24 cursor-pointer rounded-full border-2 border-dashed border-border bg-muted/40 hover:border-primary"
                  onClick={() => profilePhotoRef.current?.click()}
                >
                  {form.profilePhotoDataUrl ? (
                    <img
                      src={form.profilePhotoDataUrl}
                      alt="profile"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <input
                  ref={profilePhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onPhoto(e.target.files[0], "profile")
                  }
                />
                <p className="mt-1 text-center text-xs text-muted-foreground">Photo</p>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                <Field label="Full name *">
                  <Input
                    value={form.name ?? ""}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="John Smith"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <Field label="Date of birth">
                  <Input
                    type="date"
                    value={form.dateOfBirth ?? ""}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                  />
                </Field>
                <Field label="Gender">
                  <Select
                    value={form.gender ?? ""}
                    onValueChange={(v) =>
                      set("gender", v as Guest["gender"])
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Nationality">
                  <Input
                    value={form.nationality ?? ""}
                    onChange={(e) => set("nationality", e.target.value)}
                    placeholder="Saudi"
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Country">
                <Input
                  value={form.country ?? ""}
                  onChange={(e) => set("country", e.target.value)}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Postal code">
                <Input
                  value={form.postalCode ?? ""}
                  onChange={(e) => set("postalCode", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Address">
              <Textarea
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company">
                <Input
                  value={form.company ?? ""}
                  onChange={(e) => set("company", e.target.value)}
                />
              </Field>
              <Field label="Loyalty number">
                <Input
                  value={form.loyaltyNumber ?? ""}
                  onChange={(e) => set("loyaltyNumber", e.target.value)}
                />
              </Field>
            </div>
          </TabsContent>

          {/* ID document */}
          <TabsContent value="id" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID type">
                <Select
                  value={form.idType ?? ""}
                  onValueChange={(v) => set("idType", v as GuestIdType)}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="ID number">
                <Input
                  value={form.idNumber ?? ""}
                  onChange={(e) => set("idNumber", e.target.value)}
                />
              </Field>
              <Field label="Issued by">
                <Input
                  value={form.idIssuedBy ?? ""}
                  onChange={(e) => set("idIssuedBy", e.target.value)}
                />
              </Field>
              <Field label="Expiry date">
                <Input
                  type="date"
                  value={form.idExpiry ?? ""}
                  onChange={(e) => set("idExpiry", e.target.value)}
                />
              </Field>
            </div>

            <div>
              <Label className="text-xs">ID document photo</Label>
              <div className="mt-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4">
                {form.idPhotoDataUrl ? (
                  <div className="relative">
                    <img
                      src={form.idPhotoDataUrl}
                      alt="ID"
                      className="max-h-64 w-full rounded object-contain"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 top-2 h-7 w-7"
                      onClick={() => set("idPhotoDataUrl", undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => idPhotoRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" /> Upload ID photo (max 1MB)
                  </Button>
                )}
                <input
                  ref={idPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onPhoto(e.target.files[0], "id")
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="prefs" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preferred room type">
                <Input
                  value={form.preferences?.roomType ?? ""}
                  onChange={(e) => setPref("roomType", e.target.value)}
                  placeholder="e.g. Suite"
                />
              </Field>
              <Field label="Preferred floor">
                <Input
                  type="number"
                  value={form.preferences?.floor ?? ""}
                  onChange={(e) =>
                    setPref(
                      "floor",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </Field>
              <Field label="Bed type">
                <Input
                  value={form.preferences?.bedType ?? ""}
                  onChange={(e) => setPref("bedType", e.target.value)}
                  placeholder="King / Twin"
                />
              </Field>
              <Field label="Pillow">
                <Input
                  value={form.preferences?.pillow ?? ""}
                  onChange={(e) => setPref("pillow", e.target.value)}
                  placeholder="Soft / Firm"
                />
              </Field>
              <Field label="Language">
                <Input
                  value={form.preferences?.language ?? ""}
                  onChange={(e) => setPref("language", e.target.value)}
                />
              </Field>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="smoking-pref">Smoking room</Label>
                <Switch
                  id="smoking-pref"
                  checked={form.preferences?.smoking ?? false}
                  onCheckedChange={(v) => setPref("smoking", v)}
                />
              </div>
            </div>
            <Field label="Other preferences">
              <Textarea
                rows={2}
                value={form.preferences?.other ?? ""}
                onChange={(e) => setPref("other", e.target.value)}
              />
            </Field>
          </TabsContent>

          {/* Flags & tags */}
          <TabsContent value="flags" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div>
                  <Label htmlFor="vip">VIP guest</Label>
                  <p className="text-xs text-muted-foreground">Highlighted across the system</p>
                </div>
                <Switch
                  id="vip"
                  checked={form.vip ?? false}
                  onCheckedChange={(v) => set("vip", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <div>
                  <Label htmlFor="dnr">Do Not Rent (Blacklist)</Label>
                  <p className="text-xs text-muted-foreground">Blocks future reservations</p>
                </div>
                <Switch
                  id="dnr"
                  checked={form.doNotRent ?? false}
                  onCheckedChange={(v) => set("doNotRent", v)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g. Returning, Corporate, Honeymoon"
                />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
            </div>

            <Field label="Internal notes">
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Allergies, preferences, special requests..."
              />
            </Field>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{guestId ? "Save Changes" : "Add Guest"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
