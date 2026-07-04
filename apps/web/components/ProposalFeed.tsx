import { CONFIG, txUrl } from "@/lib/config";

/** The on-chain audit trail from the live smoke test — the trust model, in real transactions. */
const TRAIL = [
  {
    label: "route-and-deposit — split 300k, lock 400k reserve, hold 300k",
    result: "(ok deposited 1.0 · held 0.7 · locked 0.4 · split 0.3)",
    kind: "ok" as const,
    txid: CONFIG.evidence.deposit,
  },
  {
    label: "attacker tries to drain the full vault (incl. locked reserve)",
    result: "abort_by_response → (err u1003) — funds locked",
    kind: "reject" as const,
    txid: CONFIG.evidence.moneyShot,
  },
  {
    label: "withdraw unlocked 300k — the reserve stays untouched",
    result: "(ok withdrawn 0.3 · remaining 0.4 locked)",
    kind: "ok" as const,
    txid: CONFIG.evidence.unlockedWithdraw,
  },
];

export function ProposalFeed() {
  return (
    <section className="card">
      <h2>On-chain audit trail</h2>
      <p className="muted small">Real confirmed testnet transactions.</p>
      <ol className="trail">
        {TRAIL.map((t) => (
          <li key={t.txid} className={`trail-item trail-${t.kind}`}>
            <div className="row-between">
              <span>{t.label}</span>
              <span className={`badge ${t.kind === "ok" ? "badge-ok" : "badge-err"}`}>
                {t.kind === "ok" ? "success" : "aborted"}
              </span>
            </div>
            <p className="mono small">{t.result}</p>
            <a className="link small" href={txUrl(t.txid)} target="_blank" rel="noreferrer">
              {t.txid.slice(0, 10)}… ↗
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
