import { describe, expect, it } from "vitest";
import { groupFamilyPasses } from "./family";
import { quoteCart } from "./pricing";
import type { CartInput } from "./types";

const baseContact = {
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "555-0100",
};

function cart(partial: Partial<CartInput> & { attendees: CartInput["attendees"] }): CartInput {
  return {
    contact: baseContact,
    extras: { dandiyaQty: 0, dinners: [], garba: [] },
    promoCode: null,
    ...partial,
  };
}

describe("quoteCart — day passes", () => {
  it("charges adult day pass per person per day", () => {
    const q = quoteCart(
      cart({
        attendees: [
          {
            name: "Priya Sharma",
            age: 34,
            ticketType: "DAY_ADULT",
            days: ["2026-11-10", "2026-11-11", "2026-11-12"],
          },
        ],
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(3 * 1500);
    expect(q.totalCents).toBe(4500);
  });

  it("charges child day pass per person per day", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Aarav", age: 8, ticketType: "DAY_CHILD", days: ["2026-11-10", "2026-11-11"] },
        ],
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(1500 + 2 * 800);
  });
});

describe("quoteCart — all-day & family", () => {
  it("charges flat all-day child", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Aarav", age: 8, ticketType: "ALL_DAY_CHILD", days: [] },
        ],
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(1500 + 3000);
  });

  it("charges one family pass for 2A+2C same day", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Dad", age: 40, ticketType: "FAMILY", days: ["2026-11-12"] },
          { name: "Mom", age: 38, ticketType: "FAMILY", days: ["2026-11-12"] },
          { name: "Kid1", age: 9, ticketType: "FAMILY", days: ["2026-11-12"] },
          { name: "Kid2", age: 7, ticketType: "FAMILY", days: ["2026-11-12"] },
        ],
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(4000);
    expect(q.stockNeeded.FAMILY).toBe(1);
  });

  it("packs a second family pass when a 3rd adult joins", () => {
    expect(
      groupFamilyPasses([
        { name: "A", age: 40, ticketType: "FAMILY", days: ["2026-11-12"] },
        { name: "B", age: 38, ticketType: "FAMILY", days: ["2026-11-12"] },
        { name: "C", age: 35, ticketType: "FAMILY", days: ["2026-11-12"] },
        { name: "K", age: 8, ticketType: "FAMILY", days: ["2026-11-12"] },
      ])
    ).toBe(2);
  });
});

describe("quoteCart — extras", () => {
  it("prices dinner and dandiya", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-11"] },
        ],
        extras: {
          dandiyaQty: 2,
          dinners: [{ attendeeIndex: 0, day: "2026-11-11" }],
          garba: [{ attendeeIndex: 0, day: "2026-11-11" }],
        },
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(1500 + 2 * 500 + 1200 + 2000);
  });

  it("rejects garba on a non-workshop day", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-12"] },
        ],
        extras: {
          dandiyaQty: 0,
          dinners: [],
          garba: [{ attendeeIndex: 0, day: "2026-11-12" }],
        },
      })
    );
    expect(q.ok).toBe(false);
    expect(q.errors.join(" ")).toMatch(/Garba/i);
  });

  it("rejects dinner without entry that day", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
        extras: {
          dandiyaQty: 0,
          dinners: [{ attendeeIndex: 0, day: "2026-11-14" }],
          garba: [],
        },
      })
    );
    expect(q.ok).toBe(false);
    expect(q.errors.join(" ")).toMatch(/entry/i);
  });
});

describe("quoteCart — promos", () => {
  it("applies SEVA10 as 10% off", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
        promoCode: "SEVA10",
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(1500);
    expect(q.discountCents).toBe(150);
    expect(q.totalCents).toBe(1350);
  });

  it("applies FLAT20 capped at subtotal", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
        promoCode: "flat20",
      })
    );
    expect(q.ok).toBe(true);
    expect(q.discountCents).toBe(1500); // capped — only $15 cart
    expect(q.totalCents).toBe(0);
  });

  it("KIDSFREE zeros child entry lines", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Aarav", age: 8, ticketType: "DAY_CHILD", days: ["2026-11-10"] },
        ],
        promoCode: "KIDSFREE",
      })
    );
    expect(q.ok).toBe(true);
    expect(q.discountCents).toBe(800);
    expect(q.totalCents).toBe(1500);
  });

  it("rejects EXPIRED5 and MAXEDOUT with distinct messages", () => {
    const expired = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
        promoCode: "EXPIRED5",
      })
    );
    expect(expired.ok).toBe(false);
    expect(expired.errors.join(" ")).toMatch(/expired/i);

    const maxed = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
        promoCode: "MAXEDOUT",
      })
    );
    expect(maxed.ok).toBe(false);
    expect(maxed.errors.join(" ")).toMatch(/maximum/i);
  });
});

describe("quoteCart — age / booker rules", () => {
  it("rejects booker under 18", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Teen", age: 17, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
      })
    );
    expect(q.ok).toBe(false);
    expect(q.errors.join(" ")).toMatch(/18/);
  });

  it("rejects child on adult ticket", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Kid", age: 7, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
        ],
      })
    );
    expect(q.ok).toBe(false);
  });

  it("allows under-5 with no ticket", () => {
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Baby", age: 3, ticketType: null, days: [] },
        ],
      })
    );
    expect(q.ok).toBe(true);
    expect(q.subtotalCents).toBe(1500);
  });
});

describe("money stays in integer cents", () => {
  it("never produces fractional cents on SEVA10 of awkward totals", () => {
    // $8 child → 10% = 80 cents exact; $15 → 150
    const q = quoteCart(
      cart({
        attendees: [
          { name: "Priya Sharma", age: 34, ticketType: "DAY_ADULT", days: ["2026-11-10"] },
          { name: "Aarav", age: 8, ticketType: "DAY_CHILD", days: ["2026-11-10"] },
        ],
        promoCode: "SEVA10",
      })
    );
    expect(Number.isInteger(q.totalCents)).toBe(true);
    expect(q.totalCents).toBe(Math.round(2300 * 0.9));
  });
});
