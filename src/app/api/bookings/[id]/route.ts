import { getBooking } from "@/data/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, booking });
}
