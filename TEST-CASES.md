# Test cases

Automated coverage: `src/domain/ages.test.ts`, `src/domain/pricing.test.ts` (`npm test`).

## Pricing

| # | Situation | Expected |
| --- | --- | --- |
| P1 | 1 adult Day Pass × 3 days | $45 |
| P2 | 1 child Day Pass × 2 days | $16 |
| P3 | 1 All-Day Child | $30 flat |
| P4 | Family 2 adults + 2 children, same day | $40, 1 Family Pass stock |
| P5 | Family with 3 adults, same day | 2 Family Passes = $80 |
| P6 | 2× Dandiya | $10 |
| P7 | Dinner, 1 person × 1 day | $12 |
| P8 | Garba on Nov 11 | $20 |
| P9 | `SEVA10` on $15 | $1.50 off → $13.50 |
| P10 | `FLAT20` on $15 | total $0 |
| P11 | `KIDSFREE` with adult + child Day Pass | child line free, adult unchanged |
| P12 | All totals | integer cents |

## Age and tickets

| # | Situation | Expected |
| --- | --- | --- |
| A1 | Age 7 on Day Adult | Reject |
| A2 | Age 12 on Day Child | Reject |
| A3 | Age 3 with any entry ticket | Reject |
| A4 | Age 3 with no ticket + adult booker | Allowed |
| A5 | Booker age 17 | Reject |
| A6 | Age `abc` / `-1` / `200` | Reject |
| A7 | Day Pass with no days selected | Reject |

## Extras

| # | Situation | Expected |
| --- | --- | --- |
| E1 | Garba on Nov 12 | Reject |
| E2 | Dinner on a day without entry | Reject |
| E3 | Garba without entry that day | Reject |
| E4 | Duplicate dinner for same person + day | Reject |

## Promo codes

| # | Situation | Expected |
| --- | --- | --- |
| R1 | `SEVA10` | 10% off booking |
| R2 | `FLAT20` | $20 off (floors at $0) |
| R3 | `KIDSFREE` | Child entry free |
| R4 | `EXPIRED5` | Rejected as expired |
| R5 | `MAXEDOUT` | Rejected as maxed out |
| R6 | Unknown code | Rejected |
| R7 | `seva10` (lowercase) | Accepted after normalize |

## Stock and checkout

| # | Situation | Expected |
| --- | --- | --- |
| S1 | All-Day Adult via API | Sold out / reject |
| S2 | Request 3 Garba when 2 remain | Reject on checkout |
| S3 | Concurrent checkout for last Garba seats | Only available seats succeed |
| S4 | Double Pay with same idempotency key | Single booking |
| S5 | Client sends fake `totalCents` | Ignored; server recalculates |

## UI / edge cases

| # | Situation | Expected |
| --- | --- | --- |
| U1 | Mobile width | Usable single-column layout |
| U2 | Network failure on quote | Error message shown |
| U3 | Empty booking (no tickets or extras) | Reject |
| U4 | All-Day Adult in UI | Shown as sold out / disabled |
| U5 | Change age adult → child | Ticket options update |
