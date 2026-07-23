import BriefBoard from "../components/BriefBoard";

export default function HomePage() {
  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">MISSION 7 · FULL-STACK MVP</p>
        <h1 id="page-title">Sound Brief Board</h1>
        <p className="hero-copy">
          Capture a sound idea, keep the production goal clear, and move it from draft to ready.
          Every card below is loaded from the server API.
        </p>
        <div className="proof-row" aria-label="Implementation summary">
          <span>4 REST actions</span>
          <span>Persistent storage</span>
          <span>Validated requests</span>
        </div>
      </section>
      <BriefBoard />
      <footer>
        <span>Next.js API · Local JSON / Vercel Blob</span>
        <a href="/api/health">API health</a>
      </footer>
    </main>
  );
}
