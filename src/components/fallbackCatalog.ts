import {
  DAY_LABELS,
  EVENT,
  EXTRA_LABELS,
  EXTRA_PRICES_CENTS,
  FESTIVAL_DAYS,
  GARBA_DAYS,
  INITIAL_STOCK,
  TICKET_LABELS,
  TICKET_PRICES_CENTS,
} from "@/domain/catalog";
import type { Catalog } from "./types";

/** Instant UI shell — prices known; live stock filled when /api/catalog returns. */
export function fallbackCatalog(): Catalog {
  return {
    event: { name: EVENT.name, location: EVENT.location },
    days: FESTIVAL_DAYS.map((id) => ({ id, label: DAY_LABELS[id] })),
    garbaDays: [...GARBA_DAYS],
    tickets: (Object.keys(TICKET_PRICES_CENTS) as (keyof typeof TICKET_PRICES_CENTS)[]).map((id) => ({
      id,
      label: TICKET_LABELS[id],
      unitCents: TICKET_PRICES_CENTS[id],
      remaining: INITIAL_STOCK[id],
      soldOut: INITIAL_STOCK[id] <= 0,
    })),
    extras: (Object.keys(EXTRA_PRICES_CENTS) as (keyof typeof EXTRA_PRICES_CENTS)[]).map((id) => ({
      id,
      label: EXTRA_LABELS[id],
      unitCents: EXTRA_PRICES_CENTS[id],
      remaining: INITIAL_STOCK[id],
      soldOut: INITIAL_STOCK[id] <= 0,
    })),
    stockBackend: "loading",
  };
}
