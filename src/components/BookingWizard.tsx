"use client";

import { formatUsd } from "@/lib/format";
import type { AttendeeInput, BookingRecord, QuoteResult } from "@/domain/types";
import { useCallback, useEffect, useState } from "react";
import { fallbackCatalog } from "./fallbackCatalog";
import { StepDone } from "./StepDone";
import { StepPeople } from "./StepPeople";
import { StepReview } from "./StepReview";
import { StepTickets } from "./StepTickets";
import type { Catalog, DayPick, Step } from "./types";

function blankBooker(): AttendeeInput {
  return { name: "", age: 30, ticketType: "DAY_ADULT", days: ["2026-11-10"] };
}

function makeKey() {
  return crypto.randomUUID?.() ?? `idem-${Date.now()}`;
}

/** Patch only stock fields so ticket option layout stays stable. */
function mergeLiveStock(prev: Catalog, live: Catalog): Catalog {
  const ticketStock = new Map(live.tickets.map((t) => [t.id, t]));
  const extraStock = new Map(live.extras.map((e) => [e.id, e]));
  return {
    ...prev,
    event: live.event,
    days: live.days,
    garbaDays: live.garbaDays,
    stockBackend: live.stockBackend,
    tickets: prev.tickets.map((t) => {
      const next = ticketStock.get(t.id);
      if (!next) return t;
      return { ...t, remaining: next.remaining, soldOut: next.soldOut, unitCents: next.unitCents, label: next.label };
    }),
    extras: prev.extras.map((e) => {
      const next = extraStock.get(e.id);
      if (!next) return e;
      return { ...e, remaining: next.remaining, soldOut: next.soldOut, unitCents: next.unitCents, label: next.label };
    }),
  };
}

export function BookingWizard() {
  const [catalog, setCatalog] = useState<Catalog>(() => fallbackCatalog());
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("tickets");
  const [attendees, setAttendees] = useState<AttendeeInput[]>([blankBooker()]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [dandiyaQty, setDandiyaQty] = useState(0);
  const [dinners, setDinners] = useState<DayPick[]>([]);
  const [garba, setGarba] = useState<DayPick[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [idempotencyKey] = useState(makeKey);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    fetch("/api/catalog")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load catalog");
        return r.json();
      })
      .then((data: Catalog) => {
        if (cancelled) return;
        setCatalog((prev) => mergeLiveStock(prev, data));
        setCatalogReady(true);
        setError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncBookerName = (name: string) => {
    setContact((c) => ({ ...c, name }));
    setAttendees((list) => {
      if (!list.length) return list;
      const next = [...list];
      next[0] = { ...next[0], name };
      return next;
    });
  };

  const cartBody = useCallback(
    (forQuotePreview: boolean) => ({
      contact: {
        name: contact.name || attendees[0]?.name || "",
        email: contact.email || (forQuotePreview ? "pending@example.com" : ""),
        phone: contact.phone || (forQuotePreview ? "0000000" : ""),
      },
      attendees,
      extras: { dandiyaQty, dinners, garba },
      promoCode: promoCode.trim() || null,
      idempotencyKey,
    }),
    [attendees, contact, dandiyaQty, dinners, garba, promoCode, idempotencyKey]
  );

  const refreshQuote = useCallback(
    async (opts?: { surfaceErrors?: boolean }) => {
      const surfaceErrors = opts?.surfaceErrors ?? false;
      setQuoting(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cartBody(true)),
        });
        const data = (await res.json()) as QuoteResult;
        setQuote(data);
        if (surfaceErrors) {
          setErrors(data.ok ? [] : data.errors);
        }
      } catch {
        if (surfaceErrors) setErrors(["Network error while pricing."]);
      } finally {
        setQuoting(false);
      }
    },
    [cartBody]
  );

  // Quiet background quote for the sticky total — no error banners on first fold.
  useEffect(() => {
    if (step === "done" || !catalogReady) return;
    const t = setTimeout(() => void refreshQuote({ surfaceErrors: false }), 400);
    return () => clearTimeout(t);
  }, [step, catalogReady, refreshQuote]);

  const applyPromo = async () => {
    setPromoMessage(null);
    const res = await fetch("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode }),
    });
    const data = await res.json();
    setPromoMessage(data.ok ? data.message : data.error);
    await refreshQuote({ surfaceErrors: true });
  };

  const pay = async () => {
    setPaying(true);
    setErrors([]);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cartBody(false)),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrors(data.errors ?? ["Payment failed."]);
        return;
      }
      setBooking(data.booking);
      setQuote(data.quote);
      setStep("done");
      const fresh = (await fetch("/api/catalog").then((r) => r.json())) as Catalog;
      setCatalog((prev) => mergeLiveStock(prev, fresh));
      setCatalogReady(true);
    } catch {
      setErrors(["Network lost during payment. Retry is safe (same idempotency key)."]);
    } finally {
      setPaying(false);
    }
  };

  const goReview = () => {
    setErrors([]);
    setStep("review");
    void refreshQuote({ surfaceErrors: true });
  };

  const stepOrder: Step[] = ["tickets", "people", "review"];
  const showErrors = step === "review" || step === "done" ? errors.length > 0 : false;

  return (
    <div>
      <header>
        <p className="eyebrow">Radha Krishna Temple · Allen, TX</p>
        <h1 className="title">{catalog.event.name}</h1>
        <p className="subtitle">
          Book tickets for Tue 10 Nov – Sat 14 Nov 2026. Prices are confirmed by the server at checkout.
        </p>
      </header>

      {/* Fixed-height strip so loading text cannot jump the first fold */}
      <div className="status-strip" aria-live="polite">
        {catalogLoading ? (
          <span className="hint" style={{ margin: 0 }}>
            Loading live stock…
          </span>
        ) : error ? (
          <span className="hint" style={{ margin: 0, color: "var(--error)" }}>
            {error} — refresh to retry stock.
          </span>
        ) : (
          <span className="hint status-strip-ready" style={{ margin: 0 }}>
            Live stock ready
          </span>
        )}
      </div>

      {step !== "done" && (
        <div className="steps">
          {stepOrder.map((s, i) => (
            <span
              key={s}
              className={`step-pill ${stepOrder.indexOf(step) >= i ? "step-pill-on" : ""}`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
      )}

      {showErrors && (
        <div className="alert" role="alert">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      {step === "tickets" && (
        <StepTickets
          catalog={catalog}
          catalogReady={catalogReady}
          attendees={attendees}
          dandiyaQty={dandiyaQty}
          onChangeAttendees={setAttendees}
          onChangeDandiya={setDandiyaQty}
          onSyncBookerName={syncBookerName}
          onNext={() => setStep("people")}
        />
      )}

      {step === "people" && (
        <StepPeople
          catalog={catalog}
          attendees={attendees}
          contact={contact}
          dinners={dinners}
          garba={garba}
          onContact={setContact}
          onSyncBookerName={syncBookerName}
          onDinners={setDinners}
          onGarba={setGarba}
          onBack={() => setStep("tickets")}
          onNext={goReview}
        />
      )}

      {step === "review" && (
        <StepReview
          promoCode={promoCode}
          promoMessage={promoMessage}
          quote={quote}
          quoting={quoting}
          paying={paying}
          onPromoCode={setPromoCode}
          onApplyPromo={() => void applyPromo()}
          onBack={() => setStep("people")}
          onPay={() => void pay()}
        />
      )}

      {step === "done" && booking && <StepDone booking={booking} />}

      {step !== "done" && (
        <div className="sticky-total">
          Estimated total ·{" "}
          <strong>
            {!catalogReady
              ? "…"
              : quote?.ok
                ? quoting
                  ? "…"
                  : formatUsd(quote.totalCents)
                : "—"}
          </strong>
        </div>
      )}
    </div>
  );
}
