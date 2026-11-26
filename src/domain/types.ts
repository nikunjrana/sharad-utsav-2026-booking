export type TicketType =
  | "DAY_ADULT"
  | "DAY_CHILD"
  | "ALL_DAY_ADULT"
  | "ALL_DAY_CHILD"
  | "FAMILY";

export type ExtraType = "DANDIYA" | "DINNER" | "GARBA";

export type StockItem = TicketType | ExtraType;

export type AgeBand = "UNDER_5" | "CHILD" | "ADULT";

export type FestivalDay =
  | "2026-11-10"
  | "2026-11-11"
  | "2026-11-12"
  | "2026-11-13"
  | "2026-11-14";

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface AttendeeInput {
  name: string;
  age: number;
  /** null for under-5 free guests */
  ticketType: TicketType | null;
  /** Required for DAY_* and FAMILY; ignored for ALL_DAY_* (always all days) */
  days: FestivalDay[];
}

export interface DinnerSelection {
  attendeeIndex: number;
  day: FestivalDay;
}

export interface GarbaSelection {
  attendeeIndex: number;
  day: FestivalDay;
}

export interface ExtrasInput {
  dandiyaQty: number;
  dinners: DinnerSelection[];
  garba: GarbaSelection[];
}

export interface CartInput {
  contact: Contact;
  attendees: AttendeeInput[];
  extras: ExtrasInput;
  promoCode?: string | null;
  idempotencyKey?: string;
}

export interface PriceLine {
  key: string;
  label: string;
  quantity: number;
  unitCents: number;
  lineCents: number;
}

export interface QuoteResult {
  ok: boolean;
  currency: "USD";
  lines: PriceLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promoApplied: string | null;
  errors: string[];
  stockNeeded: Partial<Record<StockItem, number>>;
}

export interface BookingRecord {
  id: string;
  createdAt: string;
  contact: Contact;
  attendees: AttendeeInput[];
  extras: ExtrasInput;
  promoCode: string | null;
  lines: PriceLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentStatus: "simulated_paid";
}
