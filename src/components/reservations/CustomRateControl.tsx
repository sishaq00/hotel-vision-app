// Manual rate override control — used in NewReservation, ExtendStay, Checkout.
// Shows a button; when clicked opens a popover with a price field + required reason.
// When active, displays a clear amber badge with rack vs manual price and a remove button.
import { useState, useEffect } from "react";
import { DollarSign, Pencil, X, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ManualRateValue {
  amount: number;
  reason: string;
}

interface Props {
  /** The default/rack price for context display. */
  defaultRate: number;
  /** Currently applied override (or null when none). */
  value: ManualRateValue | null;
  onChange: (v: ManualRateValue | null) => void;
  /**
   * Label for the price field. e.g. "Manual rate per night" (default)
   * or "Final total override" for checkout.
   */
  fieldLabel?: string;
  /** Title shown on the trigger button. */
  triggerLabel?: string;
  /** Currency symbol/code, e.g. "$" or "USD". */
  currency?: string;
  /** Hard upper bound to catch typos. */
  maxAmount?: number;
}

export function CustomRateControl({
  defaultRate,
  value,
  onChange,
  fieldLabel = "Manual rate per night",
  triggerLabel = "Override rate / سعر مخصص",
  currency = "$",
  maxAmount = 100000,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState<string>(
    value ? String(value.amount) : String(defaultRate),
  );
  const [draftReason, setDraftReason] = useState<string>(value?.reason ?? "");

  useEffect(() => {
    if (open) {
      setDraftAmount(value ? String(value.amount) : String(defaultRate));
      setDraftReason(value?.reason ?? "");
    }
  }, [open, value, defaultRate]);

  const parsed = Number(draftAmount);
  const amountValid =
    !Number.isNaN(parsed) && parsed > 0 && parsed <= maxAmount;
  const reasonValid = draftReason.trim().length >= 3;
  const canApply = amountValid && reasonValid;

  const handleApply = () => {
    if (!canApply) return;
    onChange({ amount: Math.round(parsed * 100) / 100, reason: draftReason.trim() });
    setOpen(false);
  };

  const handleRemove = () => {
    onChange(null);
    setOpen(false);
  };

  if (value) {
    const isCheaper = value.amount < defaultRate;
    const isHigher = value.amount > defaultRate;
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> {fieldLabel}
        </Label>
        <div className="flex items-start justify-between gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm">
          <div className="flex flex-1 items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono font-bold">
                  {currency}{value.amount.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  rack {currency}{defaultRate.toLocaleString()}
                </span>
                {isCheaper && (
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success">
                    −{currency}{(defaultRate - value.amount).toLocaleString()}
                  </span>
                )}
                {isHigher && (
                  <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    +{currency}{(value.amount - defaultRate).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                Reason: {value.reason}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                >
                  Edit
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-3" align="end">
                <Editor
                  fieldLabel={fieldLabel}
                  currency={currency}
                  defaultRate={defaultRate}
                  draftAmount={draftAmount}
                  setDraftAmount={setDraftAmount}
                  draftReason={draftReason}
                  setDraftReason={setDraftReason}
                  amountValid={amountValid}
                  reasonValid={reasonValid}
                  canApply={canApply}
                  onApply={handleApply}
                  onCancel={() => setOpen(false)}
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleRemove}
              aria-label="Remove manual rate"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5" /> {fieldLabel} (optional)
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 h-10 border-dashed"
          >
            <DollarSign className="h-4 w-4" />
            {triggerLabel}
            <span className="ml-auto text-xs text-muted-foreground">
              default {currency}{defaultRate.toLocaleString()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-3" align="start">
          <Editor
            fieldLabel={fieldLabel}
            currency={currency}
            defaultRate={defaultRate}
            draftAmount={draftAmount}
            setDraftAmount={setDraftAmount}
            draftReason={draftReason}
            setDraftReason={setDraftReason}
            amountValid={amountValid}
            reasonValid={reasonValid}
            canApply={canApply}
            onApply={handleApply}
            onCancel={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Editor(props: {
  fieldLabel: string;
  currency: string;
  defaultRate: number;
  draftAmount: string;
  setDraftAmount: (v: string) => void;
  draftReason: string;
  setDraftReason: (v: string) => void;
  amountValid: boolean;
  reasonValid: boolean;
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{props.fieldLabel}</Label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {props.currency}
          </span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={props.draftAmount}
            onChange={(e) => props.setDraftAmount(e.target.value)}
            className="pl-7 h-9 text-sm font-mono"
            autoFocus
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Default / rack: {props.currency}{props.defaultRate.toLocaleString()}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={props.draftReason}
          onChange={(e) => props.setDraftReason(e.target.value)}
          placeholder="VIP guest, low season, special agreement…"
          rows={2}
          maxLength={200}
          className="text-sm resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          Required (min. 3 chars). Will be saved to reservation notes & audit log.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={props.onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!props.canApply}
          onClick={props.onApply}
        >
          <Check className="h-3.5 w-3.5" /> Apply
        </Button>
      </div>
    </div>
  );
}
