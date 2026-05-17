// ZATCA-style TLV QR generator for tax invoices.
// Encodes seller, tax ID, timestamp, total, VAT into TLV base64 string.
// Compatible with KSA Phase-1 e-invoicing requirements; harmless for other regions.

import QRCode from "qrcode";

interface ZatcaInput {
  sellerName: string;
  vatNumber: string;
  timestamp: string;        // ISO datetime
  invoiceTotal: number;     // total incl. VAT
  vatTotal: number;
}

function tlv(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  const out = new Uint8Array(bytes.length + 2);
  out[0] = tag;
  out[1] = bytes.length;
  out.set(bytes, 2);
  return out;
}

function concat(arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    // SSR — fallback (Buffer not always available in worker)
    let str = "";
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str);
  }
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return window.btoa(str);
}

export function buildZatcaPayload(input: ZatcaInput): string {
  return toBase64(
    concat([
      tlv(1, input.sellerName || "—"),
      tlv(2, input.vatNumber || "—"),
      tlv(3, input.timestamp),
      tlv(4, input.invoiceTotal.toFixed(2)),
      tlv(5, input.vatTotal.toFixed(2)),
    ]),
  );
}

export async function generateInvoiceQR(input: ZatcaInput): Promise<string> {
  const payload = buildZatcaPayload(input);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
