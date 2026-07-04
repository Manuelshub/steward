import { CONFIG, contractUrl } from "@/lib/config";

const DEPLOYER = CONFIG.router.split(".")[0];

export function StatBar() {
  const stats = [
    { n: "63", l: "automated tests passing" },
    { n: "4", l: "contracts live on testnet" },
    { n: "6", l: "confirmed routing txns" },
    { n: "3", l: "concentric rings of defense" },
  ];
  return (
    <div className="statbar">
      {stats.map((s) => (
        <div key={s.l} className="stat-card">
          <div className="n">{s.n}</div>
          <div className="l">{s.l}</div>
        </div>
      ))}
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    { st: "Poll signals", tag: "signals", sd: "Runway, payroll calendar, milestone flags, and live vault state." },
    { st: "AI proposes a policy", tag: "Ring 3 · untrusted", sd: "The LLM returns a structured draft: reserve amount, lock horizon, and an optional payout." },
    { st: "Compiler clamps it", tag: "Ring 2 · deterministic", sd: "Pure, on-device checks against the guardrails. Anything illegal is rejected — no transaction is built." },
    { st: "Diff", tag: "idempotent", sd: "If the compiled rules match what's already on-chain, do nothing. No wasted transactions." },
    { st: "Submit on-chain", tag: "Ring 1 · immutable", sd: "route-and-deposit runs; the vault enforces its own base invariants and executes split → lock → hold." },
    { st: "Audit", tag: "trail", sd: "Every cycle is recorded end-to-end: signal → draft → verdict → txid." },
  ];
  return (
    <section className="section">
      <p className="eyebrow">How it works</p>
      <h2>One cycle, three rings</h2>
      <p className="lead">
        The agent runs a loop. The intelligence lives entirely in the outermost, untrusted ring —
        everything inside it is deterministic or immutable.
      </p>
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.st}>
            <div className="st">{s.st}<span className="tag">{s.tag}</span></div>
            <div className="sd">{s.sd}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Guardrails() {
  const guarantees = [
    { t: "Approved payees only", d: "The agent can only send funds to wallets you've allowlisted. An unknown address is refused outright." },
    { t: "Your reserve is untouchable", d: "Locked funds stay locked until their unlock time — no one can pull them early, not the agent, not even you." },
    { t: "It can never overspend", d: "The agent can't route more than the treasury takes in, and no single payout exceeds the cap you set." },
    { t: "You stay in control", d: "Only you can change the rules — the approved payees, the reserve floor, or who owns the vault." },
  ];
  return (
    <section className="section">
      <p className="eyebrow">Your guarantees</p>
      <h2>What the vault enforces</h2>
      <p className="lead">
        These hold no matter what the AI proposes. They&apos;re enforced by the vault itself on-chain —
        not by trusting the agent to behave.
      </p>
      <div className="checklist">
        {guarantees.map((g) => (
          <div key={g.t} className="check-item">
            <div className="ck">✓</div>
            <div>
              <h4>{g.t}</h4>
              <p>{g.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Primitives() {
  const prims = [
    { ic: "🔒", h: "Lock", p: "A fixed reserve is locked until a future block height — un-withdrawable early, even by the owner." },
    { ic: "✂️", h: "Split", p: "A fixed amount is routed to an allowlisted recipient at deposit time (payroll, ops, revenue share)." },
    { ic: "💧", h: "Hold", p: "Whatever remains after split and lock stays liquid in the vault, available to withdraw." },
  ];
  return (
    <section className="section">
      <p className="eyebrow">FlowVault primitives</p>
      <h2>Define how money behaves after deposit</h2>
      <p className="lead">Steward composes the three FlowVault routing primitives, gated by its own guardrails.</p>
      <div className="feature-grid">
        {prims.map((p) => (
          <div key={p.h} className="feature">
            <div className="ic">{p.ic}</div>
            <h4>{p.h}</h4>
            <p>{p.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DeployedContracts() {
  const contracts = [
    { name: "steward-router", id: CONFIG.router, note: "our extension — allowlist + reserve floor" },
    { name: "flowvault-v2", id: CONFIG.flowvault, note: "the FlowVault routing engine" },
    { name: "mock-usdcx", id: CONFIG.token, note: "SIP-010 demo token" },
    { name: "sip-010-trait", id: `${DEPLOYER}.sip-010-trait`, note: "token trait" },
  ];
  return (
    <section className="section">
      <p className="eyebrow">On-chain</p>
      <h2>Deployed contracts</h2>
      <p className="lead">All four confirmed on Stacks testnet under one deployer.</p>
      <div className="kv">
        {contracts.map((c) => (
          <div key={c.name} className="kv-row">
            <div>
              <div className="name">{c.name} <span className="muted small">· {c.note}</span></div>
              <div className="id">{c.id}</div>
            </div>
            <a className="link small" href={contractUrl(c.id)} target="_blank" rel="noreferrer">explorer ↗</a>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Architecture() {
  const pkgs = [
    { ic: "🧮", h: "@steward/core", p: "The Policy Compiler (Ring 2) + shared types. Pure, no I/O, 18 tests." },
    { ic: "📜", h: "steward-router.clar", p: "On-chain enforcement (Ring 1): allowlist + reserve floor over FlowVault. 23 tests." },
    { ic: "🔌", h: "@steward/sdk", p: "Typed wrapper over flowvault-sdk — same-network guard, bigint boundary. 17 tests." },
    { ic: "🤖", h: "@steward/agent", p: "The decision loop (Ring 3→1): LLM proposer, cycle, audit. 5 tests." },
    { ic: "🖥️", h: "@steward/web", p: "This UI — the trust model, made visible." },
    { ic: "🛡️", h: "Defense in depth", p: "No single-layer failure loses funds: Ring 3 lies → Ring 2 clamps → Ring 1 gates." },
  ];
  return (
    <section className="section">
      <p className="eyebrow">Under the hood</p>
      <h2>Architecture</h2>
      <div className="feature-grid">
        {pkgs.map((p) => (
          <div key={p.h} className="feature">
            <div className="ic">{p.ic}</div>
            <h4>{p.h}</h4>
            <p>{p.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
