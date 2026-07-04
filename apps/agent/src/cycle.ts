/**
 * The agent cycle — ARCHITECTURE.md §6. Pure orchestration over injected ports, so the
 * whole poll -> propose -> compile -> diff -> submit -> audit flow is testable with fakes.
 *
 * This is the Ring 3 -> 2 -> 1 pipeline: an UNTRUSTED proposal (Ring 3) is clamped by the
 * deterministic compiler (Ring 2), and only a legal result is ever submitted on-chain (Ring 1).
 */
import {
  compile,
  isRejection,
  type AuditEntry,
  type GuardrailConfig,
  type PolicyDraft,
  type RoutingRules,
  type SignalContext,
} from "@steward/core";

/** Reads the current normalized signal snapshot (on-chain + config signals). */
export type ContextReader = () => Promise<SignalContext>;
/** The UNTRUSTED decision layer (LLM). Returns a proposal, never executes anything. */
export type Proposer = (ctx: SignalContext, cfg: GuardrailConfig) => Promise<PolicyDraft>;
/** Submits compiled, legal rules on-chain for the given cycle's deposit. */
export type Submitter = (rules: RoutingRules, ctx: SignalContext) => Promise<{ txId: string }>;
/** Records one full cycle for the audit trail. */
export type AuditSink = (entry: AuditEntry) => Promise<void> | void;

export interface CycleDeps {
  readContext: ContextReader;
  propose: Proposer;
  submit: Submitter;
  audit?: AuditSink;
  /** Injectable clock for deterministic tests. */
  now?: () => string;
}

/** Structural equality for routing rules (bigint-aware); null current rules never match. */
export function rulesEqual(a: RoutingRules, b: RoutingRules | null): boolean {
  if (b === null) return false;
  return (
    a.lockAmount === b.lockAmount &&
    a.lockUntilBlock === b.lockUntilBlock &&
    a.splitAddress === b.splitAddress &&
    a.splitAmount === b.splitAmount
  );
}

/**
 * Run one cycle and return its audit entry. `submit` is called ONLY when the compiler
 * accepts the draft AND the result differs from the current on-chain rules (idempotent).
 */
export async function runCycle(deps: CycleDeps, cfg: GuardrailConfig): Promise<AuditEntry> {
  const now = deps.now ?? (() => new Date().toISOString());

  const context = await deps.readContext();
  const draft = await deps.propose(context, cfg); // Ring 3 (untrusted)
  const outcome = compile(draft, context, cfg); // Ring 2 (deterministic guardrail)

  let txid: string | null = null;
  if (!isRejection(outcome) && !rulesEqual(outcome, context.vault.rules)) {
    txid = (await deps.submit(outcome, context)).txId; // Ring 1 (on-chain)
  }

  const entry: AuditEntry = { timestamp: now(), context, draft, outcome, txid };
  if (deps.audit) await deps.audit(entry);
  return entry;
}
