import type { FestivalDay, TicketType } from "@/domain/types";

export type Step = "tickets" | "people" | "review" | "done";

export interface CatalogTicket {
  id: TicketType;
  label: string;
  unitCents: number;
  /** null while live stock is still loading */
  remaining: number | null;
  soldOut: boolean;
}

export interface CatalogExtra {
  id: string;
  label: string;
  unitCents: number;
  remaining: number | null;
  soldOut: boolean;
}

export interface Catalog {
  event: { name: string; location: string };
  days: { id: FestivalDay; label: string }[];
  garbaDays: FestivalDay[];
  tickets: CatalogTicket[];
  extras: CatalogExtra[];
  stockBackend: string;
  stockReady: boolean;
}

export type DayPick = { attendeeIndex: number; day: FestivalDay };
