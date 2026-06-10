// Canvas signature pad — supports touch (tablet) and mouse.
// Staff hands the screen to the guest, who signs with finger or mouse.
import { useEffect, useRef, useState } from "react";
import { Eraser, Save, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveSignature, getSignature, clearSignature } from "@/lib/signatures";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  guestName?: string;
  signedByName?: string;
  onSaved?: () => void;
}

export function SignatureDialog({
  open, onOpenChange, reservationId, guestName, signedByName, onSaved,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Set up canvas at native pixel resolution on open / resize
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    function setup() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(240 * dpr);
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `240px`;
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#0a0a0a";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      setIsEmpty(true);

      // Load existing signature from DB if any
      void (async () => {
        const mod = await import("@/lib/signatures");
        const existing = await mod.fetchSignature(reservationId);
        if (existing) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, 240);
            setIsEmpty(false);
          };
          img.src = existing.dataUrl;
        }
      })();
    }

    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [open, reservationId]);

  function getPos(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = getPos(e);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const last = lastRef.current ?? p;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (isEmpty) setIsEmpty(false);
  }
  function onPointerUp(e: React.PointerEvent) {
    drawingRef.current = false;
    lastRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isEmpty) { toast.error("Signature is empty"); return; }
    const dataUrl = canvas.toDataURL("image/png");
    try {
      await saveSignature({
        reservationId,
        dataUrl,
        signedAt: new Date().toISOString(),
        signedByName,
        guestName,
      });
      toast.success("Signature saved");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to save signature: " + (e?.message ?? "unknown"));
    }
  }

  async function handleRemove() {
    try {
      await clearSignature(reservationId);
      handleClear();
      toast("Signature removed");
      onSaved?.();
    } catch (e: any) {
      toast.error("Failed to remove: " + (e?.message ?? "unknown"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Guest signature{guestName ? ` · ${guestName}` : ""}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Hand the device to the guest. They can sign with their finger (touch screen) or with the mouse.
        </p>

        <div
          ref={wrapRef}
          className="rounded-lg border-2 border-dashed border-border bg-white"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="block w-full cursor-crosshair rounded-lg"
            style={{ touchAction: "none" }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Sign above the line</span>
          <button type="button" onClick={handleClear} className="inline-flex items-center gap-1 hover:text-foreground">
            <Eraser className="h-3 w-3" /> Clear
          </button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-rose-600" onClick={handleRemove}>
            <X className="mr-1 h-4 w-4" /> Remove saved
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}><Save className="mr-1 h-4 w-4" /> Save signature</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
