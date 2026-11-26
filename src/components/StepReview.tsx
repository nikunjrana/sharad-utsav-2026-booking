"use client";

import { formatUsd } from "@/lib/format";
import type { QuoteResult } from "@/domain/types";

type Props = {
  promoCode: string;
  promoMessage: string | null;
  quote: QuoteResult | null;
  quoting: boolean;
  paying: boolean;
  onPromoCode: (v: string) => void;
  onApplyPromo: () => void;
  onBack: () => void;
  onPay: () => void;
};

export function StepReview({
  promoCode,
  promoMessage,
  quote,
  quoting,
  paying,
  onPromoCode,
  onApplyPromo,
  onBack,
  onPay,
}: Props) {
  return (
    <section className="panel">
      <h2 className="section-title">Review — server quote</h2>
      <p className="hint">Total comes from the server. Editing the browser cannot change the price.</p>

      <div className="card">
        <div className="row row-2" style={{ alignItems: "end" }}>
          <div>
            <label className="label" htmlFor="promo">
              Promo code
            </label>
            <input
              id="promo"
              className="input"
              value={promoCode}
              placeholder="SEVA10, FLAT20, KIDSFREE…"
              onChange={(e) => onPromoCode(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={onApplyPromo}>
            Apply
          </button>
        </div>
        {promoMessage && <p style={{ marginTop: 8, color: "var(--heading)" }}>{promoMessage}</p>}
      </div>

      {quote && (
        <div className="card">
          {quote.lines.map((line) => (
            <div className="price-row" key={line.key + line.label}>
              <span>
                {line.label} × {line.quantity}
              </span>
              <span>{formatUsd(line.lineCents)}</span>
            </div>
          ))}
          <div className="price-row">
            <span>Subtotal</span>
            <span>{formatUsd(quote.subtotalCents)}</span>
          </div>
          {quote.discountCents > 0 && (
            <div className="price-row" style={{ color: "var(--success)" }}>
              <span>Discount {quote.promoApplied ? `(${quote.promoApplied})` : ""}</span>
              <span>−{formatUsd(quote.discountCents)}</span>
            </div>
          )}
          <div className="price-total">
            <span>Total</span>
            <span>{quoting ? "…" : formatUsd(quote.totalCents)}</span>
          </div>
          <p className="hint" style={{ color: "var(--text)", marginTop: 8 }}>
            Simulated payment — no real card. Double-click safe (idempotency key).
          </p>
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={paying || !quote?.ok}
          onClick={onPay}
        >
          {paying ? "Processing…" : `Pay ${quote ? formatUsd(quote.totalCents) : ""}`}
        </button>
      </div>
    </section>
  );
}
