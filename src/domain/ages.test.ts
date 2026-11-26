import { describe, expect, it } from "vitest";
import {
  ageBand,
  isBookerAgeAllowed,
  parseAge,
  ticketMatchesAge,
} from "./ages";

describe("parseAge", () => {
  it("accepts whole numbers in range", () => {
    expect(parseAge(0)).toEqual({ ok: true, age: 0 });
    expect(parseAge(11)).toEqual({ ok: true, age: 11 });
    expect(parseAge("34")).toEqual({ ok: true, age: 34 });
  });

  it("rejects nonsense", () => {
    expect(parseAge("abc").ok).toBe(false);
    expect(parseAge(-1).ok).toBe(false);
    expect(parseAge(121).ok).toBe(false);
    expect(parseAge(3.5).ok).toBe(false);
    expect(parseAge("").ok).toBe(false);
  });
});

describe("ageBand", () => {
  it("maps ages to bands", () => {
    expect(ageBand(0)).toBe("UNDER_5");
    expect(ageBand(4)).toBe("UNDER_5");
    expect(ageBand(5)).toBe("CHILD");
    expect(ageBand(11)).toBe("CHILD");
    expect(ageBand(12)).toBe("ADULT");
    expect(ageBand(65)).toBe("ADULT");
  });
});

describe("isBookerAgeAllowed", () => {
  it("requires 18+", () => {
    expect(isBookerAgeAllowed(17)).toBe(false);
    expect(isBookerAgeAllowed(18)).toBe(true);
  });
});

describe("ticketMatchesAge", () => {
  it("blocks adult ticket for child", () => {
    expect(ticketMatchesAge("DAY_ADULT", 7)).toMatch(/child/i);
  });

  it("blocks child ticket for adult", () => {
    expect(ticketMatchesAge("DAY_CHILD", 12)).toMatch(/adult/i);
  });

  it("blocks any ticket for under-5", () => {
    expect(ticketMatchesAge("DAY_CHILD", 3)).toMatch(/free/i);
  });

  it("requires ticket for ages 5+", () => {
    expect(ticketMatchesAge(null, 9)).toMatch(/need/i);
  });

  it("allows matching combinations", () => {
    expect(ticketMatchesAge(null, 2)).toBeNull();
    expect(ticketMatchesAge("DAY_CHILD", 9)).toBeNull();
    expect(ticketMatchesAge("DAY_ADULT", 30)).toBeNull();
    expect(ticketMatchesAge("FAMILY", 8)).toBeNull();
    expect(ticketMatchesAge("FAMILY", 40)).toBeNull();
  });
});
