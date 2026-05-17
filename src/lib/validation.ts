// Centralized Zod schemas + a thin helper for parse-or-toast.
import { z } from "zod";
import { toast } from "sonner";

export const guestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(120),
  email: z
    .string()
    .trim()
    .max(255)
    .email({ message: "Invalid email address" })
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type GuestInput = z.infer<typeof guestSchema>;

export const roomSchema = z.object({
  number: z.string().trim().min(1, { message: "Room number is required" }).max(10),
  type: z.string().trim().min(1, { message: "Type is required" }).max(60),
  typeCode: z.string().trim().min(1, { message: "Code is required" }).max(8),
  floor: z.coerce.number().int().min(0).max(200),
  price: z.coerce.number().min(0).max(1_000_000),
});
export type RoomInput = z.infer<typeof roomSchema>;

export const reservationSchema = z
  .object({
    guestId: z.string().min(1, { message: "Guest is required" }),
    roomId: z.string().min(1, { message: "Room is required" }),
    checkIn: z.string().min(1, { message: "Check-in date is required" }),
    checkOut: z.string().min(1, { message: "Check-out date is required" }),
  })
  .refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });
export type ReservationInput = z.infer<typeof reservationSchema>;

// Payment method must match the store PaymentMethod type
const paymentMethodSchema = z.enum(["cash", "card", "transfer"], {
  errorMap: () => ({ message: "Payment method must be cash, card, or transfer" }),
});

export const paymentSchema = z.object({
  reservationId: z.string().min(1, { message: "Reservation is required" }),
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be greater than 0" })
    .max(10_000_000, { message: "Amount exceeds maximum allowed" }),
  method: paymentMethodSchema,
  notes: z.string().max(500).optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

// Max base64 image size: ~1 MB decoded ≈ 1_400_000 base64 chars
const MAX_PHOTO_B64_LEN = 1_400_000;

/**
 * Validates a base64 data URL for an uploaded photo.
 * Returns an error string, or null if valid.
 */
export function validatePhotoDataUrl(dataUrl: string | undefined): string | null {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith("data:image/")) return "Invalid image format";
  if (dataUrl.length > MAX_PHOTO_B64_LEN)
    return "Image is too large — please use an image under 1 MB.";
  return null;
}

/**
 * Parse with a Zod schema. Returns parsed value on success, null on failure
 * (and shows the first validation error as a toast).
 */
export function parseOrToast<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const first = r.error.issues[0];
  toast.error(first?.message ?? "Invalid input");
  return null;
}
