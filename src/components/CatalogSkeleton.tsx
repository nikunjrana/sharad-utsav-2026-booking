/** Reserved-space loading UI — no fake prices or stock. */
export function CatalogSkeleton() {
  return (
    <section className="panel panel-tickets" aria-busy="true" aria-live="polite">
      <h2 className="section-title">Who is coming?</h2>
      <p className="hint">Loading tickets and live stock…</p>

      <div className="card">
        <div className="skel skel-title" />
        <div className="row row-2" style={{ marginTop: 12 }}>
          <div className="skel skel-input" />
          <div className="skel skel-input" />
        </div>
        <div className="skel skel-option" />
        <div className="skel skel-option" />
        <div className="skel skel-option" />
        <div className="chip-wrap" style={{ marginTop: 12 }}>
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
          <div className="skel skel-chip" />
        </div>
      </div>

      <div className="card">
        <div className="skel skel-title" />
        <div className="skel skel-input" style={{ maxWidth: 120 }} />
        <div className="skel skel-line" style={{ marginTop: 12 }} />
      </div>

      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" disabled>
          Continue
        </button>
      </div>
    </section>
  );
}
