# Sharad Utsav 2026 — Festival Booking

**Live URL:** https://festival-booking-xi.vercel.app

Next.js booking flow for Sharad Utsav 2026 at Radha Krishna Temple, Allen, TX.

Pricing, age rules, promo codes, and stock are enforced on the server. The client collects the booking details and displays a quote; checkout recalculates everything before payment.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes in production | Neon Postgres connection string (stock + bookings) |

On Vercel this is set automatically by the Neon integration (`festival-db`). Locally it is loaded from `.env.local` (not committed).

Without a database URL, the app falls back to in-memory stock (local-only convenience).

Do not commit secrets. Keep `.env*` out of git.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/catalog` | Event info, ticket/extra prices, remaining stock |
| `POST` | `/api/quote` | Validate cart and return priced lines (no stock change) |
| `POST` | `/api/promo` | Validate a promo code |
| `POST` | `/api/checkout` | Re-validate, re-price, decrement stock, create booking |
| `GET` | `/api/bookings/:id` | Fetch a confirmation |

### Checkout request

```json
{
  "contact": { "name": "…", "email": "…", "phone": "…" },
  "attendees": [
    {
      "name": "…",
      "age": 34,
      "ticketType": "DAY_ADULT",
      "days": ["2026-11-10", "2026-11-11"]
    }
  ],
  "extras": {
    "dandiyaQty": 1,
    "dinners": [{ "attendeeIndex": 0, "day": "2026-11-10" }],
    "garba": [{ "attendeeIndex": 0, "day": "2026-11-11" }]
  },
  "promoCode": "SEVA10",
  "idempotencyKey": "uuid"
}
```

- `ticketType` may be `null` for guests under 5 (free entry).
- Money fields are integer cents (`totalCents`, etc.).

## Decisions I made

1. **Money in integer cents** so totals never drift from floating-point math.
2. **Stable ticket IDs** (`DAY_ADULT`, `FAMILY`, …) — business rules do not depend on display labels.
3. **Booker is attendee `[0]` and must be 18+.** Other guests can be younger adults (12–17).
4. **Under 5:** no entry ticket; can still take dinner if the family is attending that day.
5. **Family Pass:** covers up to 2 adults + 2 children for one day. Larger groups consume additional Family Passes.
6. **Dinner and Garba** require entry coverage on that day (All-Day Pass covers all five days).
7. **Garba** is only valid on Nov 11 and Nov 13, checked on the server.
8. **`KIDSFREE`:** zeros child Day/All-Day entry lines. For Family Pass, applies 50% off (treating half the flat price as the child share).
9. **`EXPIRED5` / `MAXEDOUT`:** recognized codes with specific error messages, separate from unknown codes.
10. **Checkout idempotency** via `idempotencyKey` so a double-click does not create two bookings.
11. **All-Day Adult** starts sold out (stock `0`) — disabled in the UI and rejected by the API.
12. **Stock + bookings** live in Neon Postgres so a booking at 9am is still reflected at 9pm on Vercel. Concurrent checkouts use an optimistic version lock on the stock row.
13. **Payment:** simulated for this exercise.

Also see [DESIGN.md](./DESIGN.md) and [TEST-CASES.md](./TEST-CASES.md).

## Known limitations

- Payment is simulated (no Stripe).
- No confirmation email.
- Garba stock is one shared pool (not split per workshop day).

## Deploy

```bash
npx vercel@latest --prod
```

Neon env vars should already be connected on the Vercel project.
