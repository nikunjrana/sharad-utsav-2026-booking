import { checkoutWithStock } from "@/data/store";
import { quoteCart } from "@/domain/pricing";
import type { CartInput } from "@/domain/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: CartInput;
  try {
    body = (await req.json()) as CartInput;
  } catch {
    return NextResponse.json({ ok: false, errors: ["Invalid JSON body."] }, { status: 400 });
  }

  const quote = quoteCart(body);
  if (!quote.ok) {
    return NextResponse.json(quote, { status: 400 });
  }

  try {
    const result = await checkoutWithStock({
      needed: quote.stockNeeded,
      idempotencyKey: body.idempotencyKey,
      booking: {
        contact: body.contact,
        attendees: body.attendees,
        extras: body.extras,
        promoCode: quote.promoApplied,
        lines: quote.lines,
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        totalCents: quote.totalCents,
        paymentStatus: "simulated_paid",
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          errors: result.errors,
          currency: quote.currency,
          lines: quote.lines,
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          totalCents: quote.totalCents,
          promoApplied: quote.promoApplied,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      booking: result.booking,
      quote,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ ok: false, errors: [message] }, { status: 503 });
  }
}
