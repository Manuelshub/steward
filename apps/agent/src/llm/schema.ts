/**
 * The `propose_policy` tool — the ONLY structured channel the LLM speaks through.
 * Free-form text is never executed (ARCHITECTURE.md §3, Ring 3). The compiler validates
 * everything downstream, so this schema is a shape hint, not a security boundary.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { PolicyDraft } from "@steward/core";

export const POLICY_TOOL: Anthropic.Tool = {
  name: "propose_policy",
  description:
    "Propose this cycle's treasury routing policy. The proposal is advisory: a deterministic " +
    "compiler will clamp or reject anything that violates the on-chain guardrails (allowlist, " +
    "reserve floor, max payout, future lock). Amounts are in base token units as decimal strings.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      desiredReserve: {
        type: "string",
        description: "Amount to keep LOCKED as reserve this cycle (base units, integer string).",
      },
      lockHorizonBlocks: {
        type: "integer",
        description: "How many blocks from now the reserve should remain locked.",
      },
      payout: {
        type: "object",
        additionalProperties: false,
        description: "Optional split payout to an allowlisted recipient this cycle.",
        properties: {
          recipient: { type: "string", description: "Recipient Stacks principal (must be allowlisted)." },
          amount: { type: "string", description: "Payout amount (base units, integer string)." },
        },
        required: ["recipient", "amount"],
      },
      rationale: {
        type: "string",
        description: "One or two sentences explaining the decision (for the audit trail only).",
      },
    },
    required: ["desiredReserve", "lockHorizonBlocks", "rationale"],
  },
};

/** Lenient parse of the tool input into a PolicyDraft; throws only on missing required fields. */
export function parsePolicyDraft(input: unknown): PolicyDraft {
  if (typeof input !== "object" || input === null) throw new Error("policy proposal is not an object");
  const o = input as Record<string, unknown>;
  if (typeof o.desiredReserve !== "string") throw new Error("desiredReserve missing or not a string");
  if (typeof o.lockHorizonBlocks !== "number") throw new Error("lockHorizonBlocks missing or not a number");
  if (typeof o.rationale !== "string") throw new Error("rationale missing or not a string");

  const draft: PolicyDraft = {
    desiredReserve: o.desiredReserve,
    lockHorizonBlocks: o.lockHorizonBlocks,
    rationale: o.rationale,
  };
  if (o.payout && typeof o.payout === "object") {
    const p = o.payout as Record<string, unknown>;
    if (typeof p.recipient === "string" && typeof p.amount === "string") {
      return { ...draft, payout: { recipient: p.recipient, amount: p.amount } };
    }
  }
  return draft;
}
