"use client";

import { formatUsd } from "@/lib/format";
import type { AttendeeInput, FestivalDay } from "@/domain/types";
import type { Catalog, DayPick } from "./types";

type Props = {
  catalog: Catalog;
  attendees: AttendeeInput[];
  contact: { name: string; email: string; phone: string };
  dinners: DayPick[];
  garba: DayPick[];
  onContact: (next: { name: string; email: string; phone: string }) => void;
  onSyncBookerName: (name: string) => void;
  onDinners: (next: DayPick[]) => void;
  onGarba: (next: DayPick[]) => void;
  onBack: () => void;
  onNext: () => void;
};

function coveredDays(person: AttendeeInput, allDays: FestivalDay[]): FestivalDay[] {
  if (person.ticketType === "ALL_DAY_ADULT" || person.ticketType === "ALL_DAY_CHILD") return allDays;
  if (person.ticketType === null && person.age < 5) return allDays;
  return person.days as FestivalDay[];
}

function toggle(list: DayPick[], index: number, day: FestivalDay): DayPick[] {
  const exists = list.some((x) => x.attendeeIndex === index && x.day === day);
  if (exists) return list.filter((x) => !(x.attendeeIndex === index && x.day === day));
  return [...list, { attendeeIndex: index, day }];
}

export function StepPeople({
  catalog,
  attendees,
  contact,
  dinners,
  garba,
  onContact,
  onSyncBookerName,
  onDinners,
  onGarba,
  onBack,
  onNext,
}: Props) {
  const allDays = catalog.days.map((d) => d.id);

  return (
    <section className="panel">
      <h2 className="section-title">Contact & day extras</h2>

      <div className="card">
        <div className="row row-3">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={contact.email}
              onChange={(e) => onContact({ ...contact, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className="input"
              value={contact.phone}
              onChange={(e) => onContact({ ...contact, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="booker">
              Booker name
            </label>
            <input
              id="booker"
              className="input"
              value={contact.name}
              onChange={(e) => onSyncBookerName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {attendees.map((person, index) => {
        const days = coveredDays(person, allDays);
        return (
          <div className="card" key={index}>
            <h3>
              {person.name || `Person ${index + 1}`}{" "}
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)" }}>
                age {person.age}
              </span>
            </h3>

            <p className="label">Dinner ({formatUsd(1200)} / person / day)</p>
            <div className="chip-wrap">
              {days.map((day) => {
                const on = dinners.some((d) => d.attendeeIndex === index && d.day === day);
                const label = catalog.days.find((d) => d.id === day)?.label ?? day;
                return (
                  <label key={`d-${index}-${day}`} className={`chip ${on ? "chip-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onDinners(toggle(dinners, index, day))}
                    />
                    {label}
                  </label>
                );
              })}
            </div>

            <p className="label" style={{ marginTop: 12 }}>
              Garba workshop ({formatUsd(2000)}) — Nov 11 & 13 only
            </p>
            <div className="chip-wrap">
              {catalog.garbaDays.map((day) => {
                const can = days.includes(day);
                const on = garba.some((g) => g.attendeeIndex === index && g.day === day);
                const label = catalog.days.find((d) => d.id === day)?.label ?? day;
                return (
                  <label
                    key={`g-${index}-${day}`}
                    className={`chip ${on ? "chip-on" : ""} ${!can ? "chip-off" : ""}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!can}
                      checked={on}
                      onChange={() => onGarba(toggle(garba, index, day))}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Review & pay
        </button>
      </div>
    </section>
  );
}
