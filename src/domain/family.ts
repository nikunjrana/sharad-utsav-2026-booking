import type { AttendeeInput } from "./types";

/** Count Family Passes needed: up to 2 adults + 2 children per pass, per day. */
export function groupFamilyPasses(familyAttendees: AttendeeInput[]): number {
  if (familyAttendees.length === 0) return 0;

  const byDay = new Map<string, AttendeeInput[]>();
  for (const a of familyAttendees) {
    const day = a.days[0] ?? "unknown";
    const list = byDay.get(day) ?? [];
    list.push(a);
    byDay.set(day, list);
  }

  let passes = 0;
  for (const group of byDay.values()) {
    let adults = group.filter((a) => a.age >= 12).length;
    let children = group.filter((a) => a.age >= 5 && a.age <= 11).length;
    while (adults > 0 || children > 0) {
      const takeA = Math.min(2, adults);
      const takeC = Math.min(2, children);
      adults -= takeA;
      children -= takeC;
      passes += 1;
    }
  }
  return passes;
}
