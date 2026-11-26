import { lookupPromo, normalizePromo } from "@/domain/promo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const code = normalizePromo(body.code);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter a promo code." }, { status: 400 });
  }

  const result = lookupPromo(code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    code: result.promo.code,
    message:
      result.promo.code === "SEVA10"
        ? "10% off the whole booking."
        : result.promo.code === "FLAT20"
          ? "$20 off the whole booking."
          : "Child entry tickets are free. Adult tickets and extras are unchanged.",
  });
}
