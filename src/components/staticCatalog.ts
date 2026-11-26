import {
  DAY_LABELS,
  EVENT,
  EXTRA_LABELS,
  EXTRA_PRICES_CENTS,
  FESTIVAL_DAYS,
  GARBA_DAYS,
  TICKET_LABELS,
  TICKET_PRICES_CENTS,
} from "@/domain/catalog";
import type { ExtraType, TicketType } from "@/domain/types";
import type { Catalog } from "./types";

/**
 * Hardcoded festival content that never needs a network round-trip.
 * Stock fields stay null until /api/catalog returns live counts.
 */
export function staticCatalog(): Catalog {
  const ticketIds = Object.keys(TICKET_PRICES_CENTS) as TicketType[];
  const extraIds = Object.keys(EXTRA_PRICES_CENTS) as ExtraType[];

  return {
    event: { name: EVENT.name, location: EVENT.location },
    days: FESTIVAL_DAYS.map((id) => ({ id, label: DAY_LABELS[id] })),
    garbaDays: [...GARBA_DAYS],
    tickets: ticketIds.map((id) => ({
      id,
      label: TICKET_LABELS[id],
      unitCents: TICKET_PRICES_CENTS[id],
      remaining: null,
      soldOut: false,
    })),
    extras: extraIds.map((id) => ({
      id,
      label: EXTRA_LABELS[id],
      unitCents: EXTRA_PRICES_CENTS[id],
      remaining: null,
      soldOut: false,
    })),
    stockBackend: "loading",
    stockReady: false,
  };
}

/** Merge live remaining/soldOut into the static catalog shell. */
export function applyLiveStock(base: Catalog, live: Catalog): Catalog {
  const ticketStock = new Map(live.tickets.map((t) => [t.id, t]));
  const extraStock = new Map(live.extras.map((e) => [e.id, e]));

  return {
    ...base,
    event: live.event ?? base.event,
    days: live.days?.length ? live.days : base.days,
    garbaDays: live.garbaDays?.length ? live.garbaDays : base.garbaDays,
    stockBackend: live.stockBackend,
    stockReady: true,
    tickets: base.tickets.map((t) => {
      const next = ticketStock.get(t.id);
      if (!next) return t;
      return {
        ...t,
        label: next.label,
        unitCents: next.unitCents,
        remaining: next.remaining,
        soldOut: next.soldOut,
      };
    }),
    extras: base.extras.map((e) => {
      const next = extraStock.get(e.id);
      if (!next) return e;
      return {
        ...e,
        label: next.label,
        unitCents: next.unitCents,
        remaining: next.remaining,
        soldOut: next.soldOut,
      };
    }),
  };
}
