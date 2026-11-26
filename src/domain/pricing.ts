import {
  EXTRA_LABELS,
  EXTRA_PRICES_CENTS,
  FESTIVAL_DAYS,
  TICKET_LABELS,
  TICKET_PRICES_CENTS,
} from "./catalog";
import { groupFamilyPasses } from "./family";
import { computeDiscountCents, lookupPromo, normalizePromo } from "./promo";
import type { AttendeeInput, CartInput, PriceLine, QuoteResult, StockItem } from "./types";
import { validateCart } from "./validate";

export function entryDays(attendee: AttendeeInput): string[] {
  if (!attendee.ticketType) return [];
  if (attendee.ticketType === "ALL_DAY_ADULT" || attendee.ticketType === "ALL_DAY_CHILD") {
    return [...FESTIVAL_DAYS];
  }
  return attendee.days;
}

function buildTicketLines(attendees: AttendeeInput[]): {
  lines: PriceLine[];
  stockNeeded: Partial<Record<StockItem, number>>;
} {
  const lines: PriceLine[] = [];
  const stock: Partial<Record<StockItem, number>> = {};

  const dayAdults = attendees.filter((a) => a.ticketType === "DAY_ADULT");
  const dayChildren = attendees.filter((a) => a.ticketType === "DAY_CHILD");
  const allDayAdults = attendees.filter((a) => a.ticketType === "ALL_DAY_ADULT");
  const allDayChildren = attendees.filter((a) => a.ticketType === "ALL_DAY_CHILD");
  const families = attendees.filter((a) => a.ticketType === "FAMILY");

  if (dayAdults.length) {
    const personDays = dayAdults.reduce((s, a) => s + a.days.length, 0);
    lines.push({
      key: "DAY_ADULT",
      label: TICKET_LABELS.DAY_ADULT,
      quantity: personDays,
      unitCents: TICKET_PRICES_CENTS.DAY_ADULT,
      lineCents: personDays * TICKET_PRICES_CENTS.DAY_ADULT,
    });
    stock.DAY_ADULT = dayAdults.length;
  }

  if (dayChildren.length) {
    const personDays = dayChildren.reduce((s, a) => s + a.days.length, 0);
    lines.push({
      key: "DAY_CHILD",
      label: TICKET_LABELS.DAY_CHILD,
      quantity: personDays,
      unitCents: TICKET_PRICES_CENTS.DAY_CHILD,
      lineCents: personDays * TICKET_PRICES_CENTS.DAY_CHILD,
    });
    stock.DAY_CHILD = dayChildren.length;
  }

  if (allDayAdults.length) {
    lines.push({
      key: "ALL_DAY_ADULT",
      label: TICKET_LABELS.ALL_DAY_ADULT,
      quantity: allDayAdults.length,
      unitCents: TICKET_PRICES_CENTS.ALL_DAY_ADULT,
      lineCents: allDayAdults.length * TICKET_PRICES_CENTS.ALL_DAY_ADULT,
    });
    stock.ALL_DAY_ADULT = allDayAdults.length;
  }

  if (allDayChildren.length) {
    lines.push({
      key: "ALL_DAY_CHILD",
      label: TICKET_LABELS.ALL_DAY_CHILD,
      quantity: allDayChildren.length,
      unitCents: TICKET_PRICES_CENTS.ALL_DAY_CHILD,
      lineCents: allDayChildren.length * TICKET_PRICES_CENTS.ALL_DAY_CHILD,
    });
    stock.ALL_DAY_CHILD = allDayChildren.length;
  }

  const familyGroups = groupFamilyPasses(families);
  if (familyGroups > 0) {
    lines.push({
      key: "FAMILY",
      label: TICKET_LABELS.FAMILY,
      quantity: familyGroups,
      unitCents: TICKET_PRICES_CENTS.FAMILY,
      lineCents: familyGroups * TICKET_PRICES_CENTS.FAMILY,
    });
    stock.FAMILY = familyGroups;
  }

  return { lines, stockNeeded: stock };
}

function buildExtraLines(cart: CartInput): {
  lines: PriceLine[];
  stockNeeded: Partial<Record<StockItem, number>>;
} {
  const lines: PriceLine[] = [];
  const stockNeeded: Partial<Record<StockItem, number>> = {};
  const { dandiyaQty, dinners, garba } = cart.extras;

  if (dandiyaQty > 0) {
    lines.push({
      key: "DANDIYA",
      label: EXTRA_LABELS.DANDIYA,
      quantity: dandiyaQty,
      unitCents: EXTRA_PRICES_CENTS.DANDIYA,
      lineCents: dandiyaQty * EXTRA_PRICES_CENTS.DANDIYA,
    });
    stockNeeded.DANDIYA = dandiyaQty;
  }

  if (dinners.length > 0) {
    lines.push({
      key: "DINNER",
      label: EXTRA_LABELS.DINNER,
      quantity: dinners.length,
      unitCents: EXTRA_PRICES_CENTS.DINNER,
      lineCents: dinners.length * EXTRA_PRICES_CENTS.DINNER,
    });
    stockNeeded.DINNER = dinners.length;
  }

  if (garba.length > 0) {
    lines.push({
      key: "GARBA",
      label: EXTRA_LABELS.GARBA,
      quantity: garba.length,
      unitCents: EXTRA_PRICES_CENTS.GARBA,
      lineCents: garba.length * EXTRA_PRICES_CENTS.GARBA,
    });
    stockNeeded.GARBA = garba.length;
  }

  return { lines, stockNeeded };
}

function mergeStock(
  a: Partial<Record<StockItem, number>>,
  b: Partial<Record<StockItem, number>>
): Partial<Record<StockItem, number>> {
  const out: Partial<Record<StockItem, number>> = { ...a };
  for (const [k, v] of Object.entries(b) as [StockItem, number][]) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/** Validate cart, build priced lines, apply promo. Does not change stock. */
export function quoteCart(cart: CartInput): QuoteResult {
  const errors = validateCart(cart);
  if (errors.length > 0) {
    return {
      ok: false,
      currency: "USD",
      lines: [],
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      promoApplied: null,
      errors,
      stockNeeded: {},
    };
  }

  const tickets = buildTicketLines(cart.attendees);
  const extras = buildExtraLines(cart);
  const lines = [...tickets.lines, ...extras.lines];
  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  const stockNeeded = mergeStock(tickets.stockNeeded, extras.stockNeeded);

  let discountCents = 0;
  let promoApplied: string | null = null;
  const code = normalizePromo(cart.promoCode ?? null);

  if (code) {
    const promo = lookupPromo(code);
    if (!promo.ok) {
      return {
        ok: false,
        currency: "USD",
        lines,
        subtotalCents,
        discountCents: 0,
        totalCents: subtotalCents,
        promoApplied: null,
        errors: [promo.error],
        stockNeeded,
      };
    }
    discountCents = computeDiscountCents(promo.promo.code, lines, subtotalCents);
    promoApplied = promo.promo.code;
  }

  return {
    ok: true,
    currency: "USD",
    lines,
    subtotalCents,
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
    promoApplied,
    errors: [],
    stockNeeded,
  };
}
