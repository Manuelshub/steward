/**
 * Policy Compiler — Ring 2, the deterministic guardrail (ARCHITECTURE.md §3, §7).
 *
 * Pure function. NO network, NO keys, NO I/O. Takes the LLM's untrusted PolicyDraft
 * and either clamps it into legal RoutingRules or rejects it. This is the most
 * heavily-tested unit in the codebase — it is the leash on the AI.
 *
 * This file is a SPECIFICATION STUB: signatures + invariant checklist are fixed by
 * the architecture; the clamping bodies are filled in during the build phase.
 */
import type {
  GuardrailConfig,
  PolicyDraft,
  Rejection,
  RoutingRules,
  SignalContext,
} from "./types.js";

/**
 * Compile an untrusted draft into legal routing rules, or reject it.
 *
 * Invariants enforced here (Ring 2) — each must have a dedicated unit test,
 * including the adversarial cases from the demo (ARCHITECTURE.md §11):
 *   1. payout.recipient MUST be in cfg.allowlist            → else reject
 *   2. lockUntilBlock MUST be > ctx.currentBlock + minLockHorizon
 *   3. resulting locked amount MUST be >= cfg.reserveFloor  (reserve floor)
 *   4. payout MUST be <= cfg.maxPayout                      → else clamp/reject
 *   5. splitAmount + lockAmount MUST be <= available deposit (mirror of Ring 1)
 *   6. all amounts parsed as bigint; reject non-parseable/negative values
 */
export function compile(
  _draft: PolicyDraft,
  _ctx: SignalContext,
  _cfg: GuardrailConfig,
): RoutingRules | Rejection {
  // TODO(build): implement clamping per the invariant checklist above.
  return { rejected: true, reason: "compiler not yet implemented" };
}
