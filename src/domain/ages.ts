import type { AgeBand, TicketType } from "./types";

/** Parse age from unknown input. Rejects nonsense. */
export function parseAge(raw: unknown): { ok: true; age: number } | { ok: false; error: string } {
  if (typeof raw === "string" && raw.trim() === "") {
    return { ok: false, error: "Age is required." };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: "Age must be a whole number." };
  }
  if (n < 0 || n > 120) {
    return { ok: false, error: "Age must be between 0 and 120." };
  }
  return { ok: true, age: n };
}

export function ageBand(age: number): AgeBand {
  if (age < 5) return "UNDER_5";
  if (age <= 11) return "CHILD";
  return "ADULT";
}

export function isBookerAgeAllowed(age: number): boolean {
  return age >= 18;
}

/** Which entry tickets are legal for this age band. */
export function allowedTicketTypes(band: AgeBand): TicketType[] {
  switch (band) {
    case "UNDER_5":
      return [];
    case "CHILD":
      return ["DAY_CHILD", "ALL_DAY_CHILD", "FAMILY"];
    case "ADULT":
      return ["DAY_ADULT", "ALL_DAY_ADULT", "FAMILY"];
  }
}

export function ticketMatchesAge(ticket: TicketType | null, age: number): string | null {
  const band = ageBand(age);
  if (band === "UNDER_5") {
    if (ticket !== null) {
      return "Children under 5 enter free — no ticket is needed.";
    }
    return null;
  }
  if (ticket === null) {
    return "Ages 5 and above need an entry ticket.";
  }
  const allowed = allowedTicketTypes(band);
  if (!allowed.includes(ticket)) {
    if (band === "CHILD") {
      return "Ages 5–11 must use a child ticket (or a Family Pass child slot).";
    }
    return "Ages 12+ must use an adult ticket (or a Family Pass adult slot).";
  }
  return null;
}
