/**
 * Visual of the three-ring defense (ARCHITECTURE.md §3). When `blocked` is true, the compiler
 * node lights up red and the vault node dims — showing the attack never reaches the chain.
 */
export function TrustPipeline({ blocked, active }: { blocked?: boolean; active?: boolean }) {
  const nodes = [
    { ring: "input", nt: "Signals", nd: "runway · payroll · milestones", state: "" },
    { ring: "Ring 3 · untrusted", nt: "🤖 AI proposes", nd: "LLM policy draft", state: "" },
    {
      ring: "Ring 2 · deterministic",
      nt: "🛡️ Compiler",
      nd: "clamps to legal rules",
      state: blocked ? "blocked" : active ? "passed" : "",
    },
    {
      ring: "Ring 1 · immutable",
      nt: "⛓️ Vault",
      nd: "on-chain enforcement",
      state: blocked ? "dimmed" : active ? "passed" : "",
    },
  ];

  return (
    <div className="pipeline">
      {nodes.map((n, i) => (
        <div key={n.nt} style={{ display: "contents" }}>
          <div className={`node ${n.state}`}>
            {n.state === "blocked" && <span className="blockmark">BLOCKED</span>}
            <div className="ring">{n.ring}</div>
            <div className="nt">{n.nt}</div>
            <div className="nd">{n.nd}</div>
          </div>
          {i < nodes.length - 1 && <div className="arrow">→</div>}
        </div>
      ))}
    </div>
  );
}
