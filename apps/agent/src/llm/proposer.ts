/**
 * Anthropic-backed proposer (Ring 3) — the ONLY LLM-touching adapter.
 *
 * Uses adaptive thinking with tool_choice "auto" (forced tool choice is incompatible with
 * thinking) and a single propose_policy tool. The model's output is untrusted: it is parsed
 * into a PolicyDraft and handed to the compiler, which is the actual guardrail.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { GuardrailConfig, SignalContext } from "@steward/core";
import type { Proposer } from "../cycle.js";
import { parsePolicyDraft, POLICY_TOOL } from "./schema.js";

export interface ProposerOptions {
  apiKey?: string;
  /** Defaults to STEWARD_REASONING_MODEL env or claude-opus-4-8. */
  model?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = [
  "You are Steward, an autonomous treasury agent operating under CONSTRAINED AUTONOMY.",
  "Each cycle you propose how a treasury should route its incoming deposit: how much to lock",
  "as a reserve, for how long, and an optional payout to an allowlisted recipient.",
  "",
  "Hard rules (a deterministic on-chain compiler enforces these — violations are rejected):",
  "- You may only pay recipients on the allowlist.",
  "- The locked reserve must stay at or above the reserve floor.",
  "- A single payout must not exceed the max payout.",
  "- The lock horizon must be at least the minimum and in the future.",
  "- split + lock cannot exceed the deposit being routed.",
  "",
  "Act in the treasury's interest: keep a healthy runway reserve, release payroll when due,",
  "and hold the rest liquid. Call propose_policy exactly once with your decision.",
].join("\n");

function renderContext(ctx: SignalContext, cfg: GuardrailConfig): string {
  return [
    "Signal context for this cycle:",
    `- owner (treasury principal): ${ctx.owner}`,
    `- current block height: ${ctx.currentBlock}`,
    `- deposit to route this cycle: ${ctx.pendingDeposit}`,
    `- treasury balance: ${ctx.treasuryBalance}`,
    `- runway ratio (0..1): ${ctx.runwayRatio}`,
    `- payroll due this cycle: ${ctx.payrollDue}`,
    `- milestones: ${JSON.stringify(ctx.milestones)}`,
    `- currently locked balance: ${ctx.vault.lockedBalance}`,
    `- current routing rules: ${JSON.stringify(ctx.vault.rules, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}`,
    "",
    "Guardrails (enforced downstream):",
    `- allowlist: ${cfg.allowlist.join(", ") || "(empty — no payouts allowed)"}`,
    `- reserve floor (min locked): ${cfg.reserveFloor}`,
    `- max payout: ${cfg.maxPayout}`,
    `- min lock horizon (blocks): ${cfg.minLockHorizon}`,
    "",
    "Propose this cycle's policy now.",
  ].join("\n");
}

export function createAnthropicProposer(opts: ProposerOptions = {}): Proposer {
  const client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  const model = opts.model ?? process.env.STEWARD_REASONING_MODEL ?? "claude-opus-4-8";
  const maxTokens = opts.maxTokens ?? 16000;

  return async (ctx, cfg) => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      // Adaptive thinking is the recommended mode on Opus 4.8; the pinned SDK's types lag the
      // API (they only list enabled/disabled), so we cast the correct wire value through.
      thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
      system: SYSTEM_PROMPT,
      tools: [POLICY_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: renderContext(ctx, cfg) }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("model did not call propose_policy");
    }
    return parsePolicyDraft(toolUse.input);
  };
}
