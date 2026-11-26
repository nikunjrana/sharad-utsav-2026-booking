import type { PriceLine, TicketType } from "./types";

export type PromoCode = "SEVA10" | "FLAT20" | "KIDSFREE" | "EXPIRED5" | "MAXEDOUT";

export interface PromoDefinition {
  code: PromoCode;
  /** Human reason when not applicable */
  status: "active" | "expired" | "maxed_out";
}

const PROMOS: Record<string, PromoDefinition> = {
  SEVA10: { code: "SEVA10", status: "active" },
  FLAT20: { code: "FLAT20", status: "active" },
  KIDSFREE: { code: "KIDSFREE", status: "active" },
  EXPIRED5: { code: "EXPIRED5", status: "expired" },
  MAXEDOUT: { code: "MAXEDOUT", status: "maxed_out" },
};

export function normalizePromo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function lookupPromo(
  raw: string | null | undefined
): { ok: true; promo: PromoDefinition } | { ok: false; error: string } {
  const code = normalizePromo(raw);
  if (!code) {
    return { ok: false, error: "Enter a promo code." };
  }
  const promo = PROMOS[code];
  if (!promo) {
    return { ok: false, error: `"${code}" is not a valid promo code.` };
  }
  if (promo.status === "expired") {
    return { ok: false, error: `Promo ${code} expired last month and can no longer be used.` };
  }
  if (promo.status === "maxed_out") {
    return {
      ok: false,
      error: `Promo ${code} has already been used its maximum number of times.`,
    };
  }
  return { ok: true, promo };
}

const CHILD_ENTRY_KEYS = new Set<TicketType>(["DAY_CHILD", "ALL_DAY_CHILD"]);

/** Discount in cents for an active promo. Capped at subtotal. */
export function computeDiscountCents(
  code: PromoCode,
  lines: PriceLine[],
  subtotalCents: number
): number {
  if (subtotalCents <= 0) return 0;

  switch (code) {
    case "SEVA10": {
      // Half-up to nearest cent
      return Math.round(subtotalCents * 0.1);
    }
    case "FLAT20": {
      return Math.min(subtotalCents, 2000);
    }
    case "KIDSFREE": {
      let discount = 0;
      for (const line of lines) {
        if (CHILD_ENTRY_KEYS.has(line.key as TicketType)) {
          discount += line.lineCents;
        } else if (line.key === "FAMILY") {
          discount += Math.round(line.lineCents / 2);
        }
      }
      return Math.min(subtotalCents, discount);
    }
    default:
      return 0;
  }
}
