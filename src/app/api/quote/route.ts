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
  return NextResponse.json(quote, { status: quote.ok ? 200 : 400 });
}
