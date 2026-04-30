// Rate plan helpers — read seasonal plans from localStorage and resolve nightly price.
export interface RatePlan {
  id: string;
  name: string;
  roomTypeCode: string;
  pricePerNight: number;
  validFrom: string;
  validTo: string;
  createdAt: string;
}

const STORAGE_KEY = "nexora.rate-plans.v1";

export function loadRatePlans(): RatePlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RatePlan[]) : [];
  } catch {
    return [];
  }
}

/**
 * Compute the total price for a stay, applying any rate plan that overlaps
 * each night. If no plan covers a night, fall back to the base price.
 */
export function computeStayPrice(
  basePricePerNight: number,
  roomTypeCode: string,
  checkIn: string,
  checkOut: string,
  plans: RatePlan[] = loadRatePlans(),
): { total: number; nights: number; appliedPlan?: RatePlan } {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
  );

  // Find the most relevant plan for this room type that overlaps the stay.
  const applicable = plans
    .filter((p) => p.roomTypeCode === roomTypeCode || p.roomTypeCode === "ALL")
    .filter((p) => !(p.validTo < checkIn || p.validFrom >= checkOut));

  let total = 0;
  let appliedPlan: RatePlan | undefined;

  for (let i = 0; i < nights; i++) {
    const night = new Date(start.getTime() + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const plan = applicable.find((p) => p.validFrom <= night && p.validTo >= night);
    if (plan) {
      total += plan.pricePerNight;
      appliedPlan = plan;
    } else {
      total += basePricePerNight;
    }
  }

  return { total, nights, appliedPlan };
}
