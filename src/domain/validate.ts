import { ageBand, isBookerAgeAllowed, parseAge, ticketMatchesAge } from "./ages";
import {
  FAMILY_MAX_ADULTS,
  FAMILY_MAX_CHILDREN,
  FESTIVAL_DAYS,
  GARBA_DAYS,
} from "./catalog";
import { groupFamilyPasses } from "./family";
import type { CartInput, FestivalDay, TicketType } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFestivalDay(d: string): d is FestivalDay {
  return (FESTIVAL_DAYS as string[]).includes(d);
}

function hasEntryOnDay(
  attendee: CartInput["attendees"][number],
  day: FestivalDay
): boolean {
  if (attendee.ticketType === null && ageBand(attendee.age) === "UNDER_5") {
    return true; // free guest may dine / join if family brings them
  }
  if (!attendee.ticketType) return false;
  if (attendee.ticketType === "ALL_DAY_ADULT" || attendee.ticketType === "ALL_DAY_CHILD") {
    return true;
  }
  return attendee.days.includes(day);
}

export function validateCart(cart: CartInput): string[] {
  const errors: string[] = [];

  // --- Contact ---
  if (!cart.contact?.name?.trim()) errors.push("Booker name is required.");
  if (!cart.contact?.email?.trim() || !EMAIL_RE.test(cart.contact.email.trim())) {
    errors.push("A valid booker email is required.");
  }
  if (!cart.contact?.phone?.trim() || cart.contact.phone.trim().length < 7) {
    errors.push("A valid booker phone number is required.");
  }

  if (!Array.isArray(cart.attendees) || cart.attendees.length === 0) {
    errors.push("Add at least one person to the booking.");
    return errors;
  }

  // --- Booker is attendee[0] and must be 18+ ---
  const booker = cart.attendees[0];
  const bookerAge = parseAge(booker.age);
  if (!bookerAge.ok) {
    errors.push(`Booker: ${bookerAge.error}`);
  } else if (!isBookerAgeAllowed(bookerAge.age)) {
    errors.push("The person booking must be 18 or older.");
  }

  // --- Each attendee ---
  cart.attendees.forEach((a, i) => {
    const who = a.name?.trim() ? a.name.trim() : `Person ${i + 1}`;
    if (!a.name?.trim()) {
      errors.push(`${who}: name is required.`);
    }

    const ageResult = parseAge(a.age);
    if (!ageResult.ok) {
      errors.push(`${who}: ${ageResult.error}`);
      return;
    }
    const age = ageResult.age;
    const band = ageBand(age);

    const matchErr = ticketMatchesAge(a.ticketType, age);
    if (matchErr) errors.push(`${who}: ${matchErr}`);

    if (a.ticketType === "DAY_ADULT" || a.ticketType === "DAY_CHILD") {
      if (!a.days?.length) {
        errors.push(`${who}: choose at least one day for a Day Pass.`);
      } else {
        for (const d of a.days) {
          if (!isFestivalDay(d)) errors.push(`${who}: invalid day ${d}.`);
        }
        const unique = new Set(a.days);
        if (unique.size !== a.days.length) {
          errors.push(`${who}: duplicate days on Day Pass.`);
        }
      }
    }

    if (a.ticketType === "ALL_DAY_ADULT" || a.ticketType === "ALL_DAY_CHILD") {
      // Days are implied; ignore client days
    }

    if (a.ticketType === "FAMILY") {
      if (!a.days || a.days.length !== 1 || !isFestivalDay(a.days[0])) {
        errors.push(`${who}: Family Pass covers exactly one day — pick one.`);
      }
      if (band === "UNDER_5") {
        errors.push(`${who}: under-5s do not use a Family Pass slot.`);
      }
    }

    // Adults/children on Family Pass: composition checked below as a group
    void band;
  });

  // --- Family Pass composition per day ---
  const familyMembers = cart.attendees.filter((a) => a.ticketType === "FAMILY");
  if (familyMembers.length > 0) {
    const byDay = new Map<string, typeof familyMembers>();
    for (const m of familyMembers) {
      const day = m.days[0];
      if (!day) continue;
      const list = byDay.get(day) ?? [];
      list.push(m);
      byDay.set(day, list);
    }
    for (const [day, group] of byDay) {
      const adults = group.filter((a) => a.age >= 12).length;
      const children = group.filter((a) => a.age >= 5 && a.age <= 11).length;
      // Soft check: warn if a single pass can't cover — pricing packs into multiple passes.
      // Hard reject only empty nonsense
      if (adults === 0 && children === 0) {
        errors.push(`Family Pass on ${day}: need at least one adult or child (ages 5–11).`);
      }
      // Documented decision: more than 2A+2C is OK — we sell additional Family Passes.
      // Cap absurd sizes
      if (adults > FAMILY_MAX_ADULTS * 5 || children > FAMILY_MAX_CHILDREN * 5) {
        errors.push(`Family Pass on ${day}: too many people for one booking group.`);
      }
    }
    // Ensure packing produces ≥1
    if (groupFamilyPasses(familyMembers) < 1 && familyMembers.length > 0) {
      errors.push("Family Pass group could not be priced.");
    }
  }

  // --- No overlapping entry for same person (single ticket type already) ---
  // --- Extras ---
  const extras = cart.extras ?? { dandiyaQty: 0, dinners: [], garba: [] };

  if (!Number.isInteger(extras.dandiyaQty) || extras.dandiyaQty < 0 || extras.dandiyaQty > 50) {
    errors.push("Dandiya quantity must be a whole number between 0 and 50.");
  }

  for (const d of extras.dinners ?? []) {
    if (d.attendeeIndex < 0 || d.attendeeIndex >= cart.attendees.length) {
      errors.push("Dinner references an unknown person.");
      continue;
    }
    if (!isFestivalDay(d.day)) {
      errors.push(`Dinner: invalid day ${d.day}.`);
      continue;
    }
    const person = cart.attendees[d.attendeeIndex];
    if (!hasEntryOnDay(person, d.day)) {
      errors.push(
        `Dinner for ${person.name || "guest"} on ${d.day}: they need entry coverage that day.`
      );
    }
  }

  // Duplicate dinner (same person+day)
  const dinnerKeys = new Set<string>();
  for (const d of extras.dinners ?? []) {
    const key = `${d.attendeeIndex}:${d.day}`;
    if (dinnerKeys.has(key)) {
      errors.push("Duplicate dinner selection for the same person and day.");
    }
    dinnerKeys.add(key);
  }

  for (const g of extras.garba ?? []) {
    if (g.attendeeIndex < 0 || g.attendeeIndex >= cart.attendees.length) {
      errors.push("Garba workshop references an unknown person.");
      continue;
    }
    if (!GARBA_DAYS.includes(g.day)) {
      errors.push("Garba Workshop only runs on Nov 11 and Nov 13.");
      continue;
    }
    const person = cart.attendees[g.attendeeIndex];
    if (!hasEntryOnDay(person, g.day)) {
      errors.push(
        `Garba for ${person.name || "guest"} on ${g.day}: they need entry coverage that day.`
      );
    }
    // Workshop is for ages that can participate — toddlers ok with guardian; no hard age block
  }

  const garbaKeys = new Set<string>();
  for (const g of extras.garba ?? []) {
    const key = `${g.attendeeIndex}:${g.day}`;
    if (garbaKeys.has(key)) {
      errors.push("Duplicate Garba selection for the same person and day.");
    }
    garbaKeys.add(key);
  }

  // Must buy something with a ticket or extra (under-5-only booking with no extras is empty)
  const hasTicket = cart.attendees.some((a) => a.ticketType !== null);
  const hasExtra =
    (extras.dandiyaQty ?? 0) > 0 ||
    (extras.dinners?.length ?? 0) > 0 ||
    (extras.garba?.length ?? 0) > 0;
  if (!hasTicket && !hasExtra) {
    errors.push("Your booking has nothing to purchase.");
  }

  return errors;
}

export function isTicketType(v: string): v is TicketType {
  return (
    v === "DAY_ADULT" ||
    v === "DAY_CHILD" ||
    v === "ALL_DAY_ADULT" ||
    v === "ALL_DAY_CHILD" ||
    v === "FAMILY"
  );
}
