# Design note — Sharad Utsav 2026 booking

Written before implementation. Final behaviour and trade-offs are also listed under “Decisions I made” in the README.

## Modelling

- **Tickets** use stable IDs (`DAY_ADULT`, `DAY_CHILD`, `ALL_DAY_ADULT`, `ALL_DAY_CHILD`, `FAMILY`), not display labels.
- **People** map age → band (`UNDER_5` | `CHILD` | `ADULT`), which gates which ticket types are allowed.
- **Dates** are ISO day strings for the five festival days. Day Pass selects a subset; All-Day covers all five; Family covers exactly one.
- **Money** is integer cents. Unit prices live in a server-side catalog. The client may show an estimate; checkout uses the server total only.
- **Extras:** dandiya (quantity), dinner (person × day), garba (person × day, Nov 11 / 13 only).
- **Stock** is a map of item → remaining count, decremented on successful checkout.

## Planned endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/catalog` | Days, tickets, extras, stock |
| POST | `/api/quote` | Validate + price; no stock write |
| POST | `/api/promo` | Validate promo code |
| POST | `/api/checkout` | Re-validate, re-price, decrement stock, create booking |
| GET | `/api/bookings/:id` | Confirmation |

## Tricky cases spotted early

1. Family Pass composition (fewer/more than 2 adults + 2 children; under-5s).
2. Mixing All-Day, Day, and Family tickets in one booking.
3. Dinner or Garba on a day without entry.
4. How `KIDSFREE` interacts with a flat Family Pass.
5. All-Day Adult stock at 0 and Garba stock at 2.
6. Booker must be 18+; other adults may be 12–17.
7. Keeping attendee details aligned when the cart changes.
8. Double-click pay / concurrent checkout on last Garba seats.
9. Distinct handling for expired vs maxed-out vs unknown promos.
10. Serverless hosting: in-memory stock will not persist across instances.

## Out of scope for v1

- Real Stripe charges (simulated payment).
- Multi-festival admin / CMS.
- User accounts and booking history beyond confirmation id.
- Refunds and ticket transfers.
- Sending confirmation email (on-page confirmation only).
