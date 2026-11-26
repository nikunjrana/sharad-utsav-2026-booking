"use client";

import { formatUsd } from "@/lib/format";
import type { AttendeeInput, FestivalDay, TicketType } from "@/domain/types";
import { stockLabel } from "./stockLabel";
import type { Catalog } from "./types";

type Props = {
  catalog: Catalog;
  attendees: AttendeeInput[];
  dandiyaQty: number;
  onChangeAttendees: (next: AttendeeInput[]) => void;
  onChangeDandiya: (n: number) => void;
  onSyncBookerName: (name: string) => void;
  onNext: () => void;
};

function blankPerson(): AttendeeInput {
  return { name: "", age: 30, ticketType: "DAY_ADULT", days: ["2026-11-10"] };
}

function ticketsForAge(age: number, tickets: Catalog["tickets"]) {
  if (age <= 11) {
    return tickets.filter((t) => t.id === "DAY_CHILD" || t.id === "ALL_DAY_CHILD" || t.id === "FAMILY");
  }
  return tickets.filter((t) => t.id === "DAY_ADULT" || t.id === "ALL_DAY_ADULT" || t.id === "FAMILY");
}

export function StepTickets({
  catalog,
  attendees,
  dandiyaQty,
  onChangeAttendees,
  onChangeDandiya,
  onSyncBookerName,
  onNext,
}: Props) {
  const update = (index: number, patch: Partial<AttendeeInput>) => {
    const next = attendees.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChangeAttendees(next);
  };

  const setAge = (index: number, age: number) => {
    let ticketType = attendees[index].ticketType;
    if (age < 5) ticketType = null;
    else if (age <= 11 && (ticketType === "DAY_ADULT" || ticketType === "ALL_DAY_ADULT" || ticketType === null)) {
      ticketType = "DAY_CHILD";
    } else if (age >= 12 && (ticketType === "DAY_CHILD" || ticketType === "ALL_DAY_CHILD" || ticketType === null)) {
      ticketType = "DAY_ADULT";
    }
    update(index, { age, ticketType });
  };

  const setTicket = (index: number, id: TicketType) => {
    const current = attendees[index];
    let days: FestivalDay[] = current.days;
    if (id === "FAMILY") days = [current.days[0] ?? "2026-11-10"];
    else if (id.startsWith("ALL_DAY")) days = [];
    else if (!days.length) days = ["2026-11-10"];
    update(index, { ticketType: id, days });
  };

  const toggleDay = (index: number, day: FestivalDay, family: boolean) => {
    const current = attendees[index];
    if (family) {
      update(index, { days: [day] });
      return;
    }
    const set = new Set(current.days);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update(index, {
      days: catalog.days.map((d) => d.id).filter((id) => set.has(id)),
    });
  };

  const remove = (index: number) => {
    onChangeAttendees(attendees.filter((_, i) => i !== index));
  };

  const dandiya = catalog.extras.find((e) => e.id === "DANDIYA");
  const garba = catalog.extras.find((e) => e.id === "GARBA");

  return (
    <section className="panel panel-tickets">
      <h2 className="section-title">Who is coming?</h2>
      <p className="hint">
        Under 5 = free (no ticket). Ages 5–11 = child. Ages 12+ = adult. Booker (first person) must be 18+.
      </p>

      {attendees.map((person, index) => (
        <div className="card" key={index}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{index === 0 ? "Booker (pays)" : `Guest ${index + 1}`}</h3>
            {index > 0 && (
              <button type="button" className="btn-link" onClick={() => remove(index)}>
                Remove
              </button>
            )}
          </div>

          <div className="row row-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label" htmlFor={`name-${index}`}>
                Full name
              </label>
              <input
                id={`name-${index}`}
                className="input"
                value={person.name}
                onChange={(e) => {
                  if (index === 0) onSyncBookerName(e.target.value);
                  else update(index, { name: e.target.value });
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor={`age-${index}`}>
                Age
              </label>
              <input
                id={`age-${index}`}
                className="input"
                type="number"
                min={0}
                max={120}
                value={person.age}
                onChange={(e) => setAge(index, Number(e.target.value))}
              />
            </div>
          </div>

          {person.age < 5 ? (
            <p className="ok-text">Under 5 — free entry, no ticket needed.</p>
          ) : (
            <>
              <p className="label">Ticket</p>
              {ticketsForAge(person.age, catalog.tickets).map((t) => (
                <label
                  key={t.id}
                  className={`option ${person.ticketType === t.id ? "option-on" : ""} ${t.soldOut ? "option-sold" : ""}`}
                >
                  <input
                    type="radio"
                    name={`ticket-${index}`}
                    disabled={t.soldOut}
                    checked={person.ticketType === t.id}
                    onChange={() => setTicket(index, t.id)}
                  />
                  <span>
                    <strong>{t.label}</strong>
                    <span>
                      {formatUsd(t.unitCents)}
                      {t.id.startsWith("DAY_") ? " / person / day" : " flat"}
                      {stockLabel(t.remaining, t.soldOut)}
                    </span>
                  </span>
                </label>
              ))}

              {(person.ticketType === "DAY_ADULT" ||
                person.ticketType === "DAY_CHILD" ||
                person.ticketType === "FAMILY") && (
                <>
                  <p className="label">
                    {person.ticketType === "FAMILY" ? "Which one day?" : "Which days?"}
                  </p>
                  <div className="chip-wrap">
                    {catalog.days.map((d) => {
                      const on = person.days.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`chip ${on ? "chip-on" : ""}`}
                          onClick={() => toggleDay(index, d.id, person.ticketType === "FAMILY")}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-ghost" onClick={() => onChangeAttendees([...attendees, blankPerson()])}>
        + Add another person
      </button>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Extras</h3>
        <label className="label" htmlFor="dandiya">
          Dandiya sticks (pairs) — {formatUsd(dandiya?.unitCents ?? 500)} each
          {stockLabel(dandiya?.remaining ?? null, dandiya?.soldOut ?? false)}
        </label>
        <input
          id="dandiya"
          className="input"
          style={{ maxWidth: 120 }}
          type="number"
          min={0}
          max={50}
          value={dandiyaQty}
          onChange={(e) => onChangeDandiya(Math.max(0, Number(e.target.value) || 0))}
        />
        <p className="hint" style={{ color: "var(--text)", marginTop: 10 }}>
          Dinner & Garba are chosen on the next step. Garba: Nov 11 & 13 only
          {stockLabel(garba?.remaining ?? null, garba?.soldOut ?? false)}
        </p>
      </div>

      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Continue
        </button>
      </div>
    </section>
  );
}
