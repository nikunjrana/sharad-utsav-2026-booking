import type { ExtraType, FestivalDay, StockItem, TicketType } from "./types";

export const EVENT = {
  name: "Sharad Utsav 2026",
  location: "Radha Krishna Temple, Allen, Texas",
  currency: "USD" as const,
};

export const FESTIVAL_DAYS: FestivalDay[] = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];

export const DAY_LABELS: Record<FestivalDay, string> = {
  "2026-11-10": "Tue 10 Nov",
  "2026-11-11": "Wed 11 Nov",
  "2026-11-12": "Thu 12 Nov",
  "2026-11-13": "Fri 13 Nov",
  "2026-11-14": "Sat 14 Nov",
};

/** Garba workshop only runs on these days. */
export const GARBA_DAYS: FestivalDay[] = ["2026-11-11", "2026-11-13"];

/** Unit prices in integer cents. */
export const TICKET_PRICES_CENTS: Record<TicketType, number> = {
  DAY_ADULT: 1500,
  DAY_CHILD: 800,
  ALL_DAY_ADULT: 6000,
  ALL_DAY_CHILD: 3000,
  FAMILY: 4000,
};

export const EXTRA_PRICES_CENTS: Record<ExtraType, number> = {
  DANDIYA: 500,
  DINNER: 1200,
  GARBA: 2000,
};

export const TICKET_LABELS: Record<TicketType, string> = {
  DAY_ADULT: "Day Pass – Adult",
  DAY_CHILD: "Day Pass – Child",
  ALL_DAY_ADULT: "All-Day Pass – Adult",
  ALL_DAY_CHILD: "All-Day Pass – Child",
  FAMILY: "Family Pass",
};

export const EXTRA_LABELS: Record<ExtraType, string> = {
  DANDIYA: "Dandiya Sticks (pair)",
  DINNER: "Dinner Plate",
  GARBA: "Garba Workshop",
};

/** Seed stock for a fresh environment. */
export const INITIAL_STOCK: Record<StockItem, number> = {
  DAY_ADULT: 380,
  DAY_CHILD: 260,
  ALL_DAY_ADULT: 0,
  ALL_DAY_CHILD: 140,
  FAMILY: 95,
  DANDIYA: 900,
  DINNER: 1700,
  GARBA: 2,
};

export const FAMILY_MAX_ADULTS = 2;
export const FAMILY_MAX_CHILDREN = 2;
