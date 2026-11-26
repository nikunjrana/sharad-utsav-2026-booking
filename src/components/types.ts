import type { FestivalDay, TicketType } from "@/domain/types";

export type Step = "tickets" | "people" | "review" | "done";

export interface CatalogTicket {
  id: TicketType;
  label: string;
  unitCents: number;
  remaining: number;
  soldOut: boolean;
}

export interface Catalog {
  event: { name: string; location: string };
  days: { id: FestivalDay; label: string }[];
  garbaDays: FestivalDay[];
  tickets: CatalogTicket[];
  extras: { id: string; label: string; unitCents: number; remaining: number; soldOut: boolean }[];
  stockBackend: string;
}

export type DayPick = { attendeeIndex: number; day: FestivalDay };
