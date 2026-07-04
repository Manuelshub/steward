"use client";
import { useState } from "react";
import { compile, isRejection } from "@steward/core";
import { txUrl } from "@/lib/config";
import { CONTEXT, GUARDRAILS, SCENARIOS } from "@/lib/samples";
import { TrustPipeline } from "./TrustPipeline";

/**
 * The centerpiece: runs the REAL @steward/core compiler (Ring 2) in the browser on an
 * adversarial LLM proposal, showing it stopped before anything reaches the chain.
 */
export function AttackDemo() {
  const [key, setKey] = useState(SCENARIOS[0].key);
  const scenario = SCENARIOS.find((s) => s.key === key)!;
  const outcome = compile(scenario.draft, CONTEXT, GUARDRAILS);
  const rejected = isRejection(outcome);

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <h2>Constrained autonomy, live</h2>
          <p className="muted small">
            The compiler that leashes the AI runs right here in your browser — the same
            <code> @steward/core</code> the agent uses on-chain.
          </p>
        </div>
        <span className={`badge ${rejected ? "badge-err" : "badge-ok"}`}>
          {rejected ? "✕ attack blocked" : "✓ policy legal"}
        </span>
      </div>

      <div className="row" style={{ margin: "16px 0 20px" }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            className={`btn ${s.key === key ? "btn-active" : ""} ${s.kind === "attack" ? "btn-danger" : ""}`}
            onClick={() => setKey(s.key)}
          >
            {s.kind === "attack" ? "💀 " : "✓ "}
            {s.label}
          </button>
        ))}
      </div>

      <TrustPipeline blocked={rejected} active />

      <div className="grid2" style={{ marginTop: 18 }}>
        <div>
          <h3>Untrusted proposal · Ring 3</h3>
          <pre className="mono">
{`reserve   ${scenario.draft.desiredReserve}
lock      +${scenario.draft.lockHorizonBlocks} blocks
payout    ${scenario.draft.payout ? `${scenario.draft.payout.amount} → ${scenario.draft.payout.recipient.slice(0, 12)}…` : "(none)"}

"${scenario.draft.rationale}"`}
          </pre>
        </div>
        <div>
          <h3>Compiler verdict · Ring 2</h3>
          {isRejection(outcome) ? (
            <div className="verdict verdict-reject">
              <span className="badge badge-err">REJECTED</span>
              <p className="mono small err" style={{ margin: "8px 0 6px" }}>{outcome.reason}</p>
              <p className="muted small" style={{ margin: 0 }}>
                No transaction is submitted. The AI never had the authority — the vault does.
              </p>
            </div>
          ) : (
            <div className="verdict verdict-ok">
              <span className="badge badge-ok">COMPILED → legal rules</span>
              <pre className="mono" style={{ marginTop: 8 }}>
{`lockAmount      ${outcome.lockAmount}
lockUntilBlock  ${outcome.lockUntilBlock}
splitAddress    ${outcome.splitAddress ? `${outcome.splitAddress.slice(0, 12)}…` : "(none)"}
splitAmount     ${outcome.splitAmount}`}
              </pre>
              {scenario.evidenceTxid && (
                <a className="link small" href={txUrl(scenario.evidenceTxid)} target="_blank" rel="noreferrer">
                  → this exact routing ran on testnet ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
