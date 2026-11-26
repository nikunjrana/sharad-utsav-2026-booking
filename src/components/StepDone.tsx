"use client";

import { formatUsd } from "@/lib/format";
import type { BookingRecord } from "@/domain/types";

export function StepDone({ booking }: { booking: BookingRecord }) {
  return (
    <section className="panel">
      <p className="ok-text" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Confirmed
      </p>
      <h2 className="section-title">You&apos;re booked for Sharad Utsav</h2>
      <p className="hint">
        Confirmation ID: <span className="confirm-id">{booking.id}</span>
      </p>

      <div className="card">
        <p style={{ color: "var(--heading)", marginTop: 0 }}>
          {booking.contact.name} · {booking.contact.email} · {booking.contact.phone}
        </p>
        <p className="price-total" style={{ border: "none", padding: 0, margin: "8px 0 12px" }}>
          <span>Paid</span>
          <span>{formatUsd(booking.totalCents)}</span>
        </p>
        {booking.lines.map((line) => (
          <div className="price-row" key={line.key}>
            <span>
              {line.label} × {line.quantity}
            </span>
            <span>{formatUsd(line.lineCents)}</span>
          </div>
        ))}
      </div>

      <p className="hint">Show this confirmation at the door. Volunteers match names and ages.</p>
    </section>
  );
}
