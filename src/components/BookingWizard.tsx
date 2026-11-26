"use client";

import { EVENT } from "@/domain/catalog";
import { formatUsd } from "@/lib/format";
import type { AttendeeInput, BookingRecord, QuoteResult } from "@/domain/types";
import { useCallback, useEffect, useState } from "react";
import { CatalogSkeleton } from "./CatalogSkeleton";
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

export function BookingWizard() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
    fetch("/api/catalog")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load catalog");
        return r.json();
      })
      .then((data: Catalog) => {
        if (cancelled) return;
        setCatalog(data);
        setCatalogError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setCatalogError(e.message);
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
    async (opts?: { showErrors?: boolean }) => {
      const showErrors = opts?.showErrors ?? false;
      setQuoting(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cartBody(true)),
        });
        const data = (await res.json()) as QuoteResult;
        setQuote(data);
        if (showErrors) setErrors(data.ok ? [] : data.errors);
      } catch {
        if (showErrors) setErrors(["Network error while pricing."]);
      } finally {
        setQuoting(false);
      }
    },
    [cartBody]
  );

  // Quiet live quote once catalog is ready — no error flicker on first steps
  useEffect(() => {
    if (step === "done" || !catalog) return;
    const t = setTimeout(() => void refreshQuote({ showErrors: false }), 350);
    return () => clearTimeout(t);
  }, [step, catalog, refreshQuote]);

  const applyPromo = async () => {
    setPromoMessage(null);
    const res = await fetch("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode }),
    });
    const data = await res.json();
    setPromoMessage(data.ok ? data.message : data.error);
    await refreshQuote({ showErrors: true });
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
      setCatalog(fresh);
    } catch {
      setErrors(["Network lost during payment. Retry is safe (same idempotency key)."]);
    } finally {
      setPaying(false);
    }
  };

  const goReview = () => {
    setErrors([]);
    setStep("review");
    void refreshQuote({ showErrors: true });
  };

  const stepOrder: Step[] = ["tickets", "people", "review"];
  const showStepErrors = step === "review" && errors.length > 0;

  const totalLabel = !catalog
    ? "…"
    : quoting
      ? "…"
      : quote?.ok
        ? formatUsd(quote.totalCents)
        : "—";

  return (
    <div>
      <header>
        <p className="eyebrow">Radha Krishna Temple · Allen, TX</p>
        <h1 className="title">{EVENT.name}</h1>
        <p className="subtitle">
          Book tickets for Tue 10 Nov – Sat 14 Nov 2026. Prices are confirmed by the server at
          checkout.
        </p>
      </header>

      {/* Fixed-height status so load text does not jump the page */}
      <div className="status-strip" aria-live="polite">
        {!catalog && !catalogError ? (
          <span className="hint" style={{ margin: 0 }}>
            Loading live stock…
          </span>
        ) : catalogError ? (
          <span className="hint" style={{ margin: 0, color: "var(--error)" }}>
            {catalogError} — refresh to retry.
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

      {showStepErrors && (
        <div className="alert" role="alert">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      {step === "tickets" &&
        (catalog ? (
          <StepTickets
            catalog={catalog}
            attendees={attendees}
            dandiyaQty={dandiyaQty}
            onChangeAttendees={setAttendees}
            onChangeDandiya={setDandiyaQty}
            onSyncBookerName={syncBookerName}
            onNext={() => setStep("people")}
          />
        ) : (
          <CatalogSkeleton />
        ))}

      {step === "people" && catalog && (
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
        <div className="sticky-total" aria-live="polite">
          Estimated total · <strong>{totalLabel}</strong>
        </div>
      )}
    </div>
  );
}
