import { DAY_LABELS, EVENT, EXTRA_LABELS, EXTRA_PRICES_CENTS, FESTIVAL_DAYS, GARBA_DAYS, INITIAL_STOCK, TICKET_LABELS, TICKET_PRICES_CENTS } from "@/domain/catalog";
import { getStock, usingDatabase } from "@/data/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const stock = await getStock();
  return NextResponse.json({
    event: EVENT,
    days: FESTIVAL_DAYS.map((id) => ({ id, label: DAY_LABELS[id] })),
    garbaDays: GARBA_DAYS,
    tickets: (Object.keys(TICKET_PRICES_CENTS) as (keyof typeof TICKET_PRICES_CENTS)[]).map(
      (id) => ({
        id,
        label: TICKET_LABELS[id],
        unitCents: TICKET_PRICES_CENTS[id],
        remaining: stock[id],
        soldOut: stock[id] <= 0,
      })
    ),
    extras: (Object.keys(EXTRA_PRICES_CENTS) as (keyof typeof EXTRA_PRICES_CENTS)[]).map((id) => ({
      id,
      label: EXTRA_LABELS[id],
      unitCents: EXTRA_PRICES_CENTS[id],
      remaining: stock[id],
      soldOut: stock[id] <= 0,
    })),
    stockBackend: usingDatabase() ? "neon" : "memory",
    seedStock: INITIAL_STOCK,
  });
}
