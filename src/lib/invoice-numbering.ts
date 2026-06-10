// Server-issued invoice numbers via DB sequence.
// Guarantees uniqueness across concurrent devices.
import { supabase } from "@/integrations/supabase/client";

export async function issueInvoiceNumber(prefix = "INV"): Promise<string> {
  const { data, error } = await supabase.rpc("issue_invoice_number", {
    p_prefix: prefix,
  } as any);
  if (error) throw new Error(error.message);
  return data as string;
}
