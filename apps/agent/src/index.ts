/**
 * Agent entrypoint (E4.3, E4.5). Wires the real adapters and runs the cycle on an interval.
 *
 * KEY CUSTODY: the operator senderKey is read here, server-side only, and passed into the
 * StewardVault. It never reaches the browser (ARCHITECTURE.md §3, §10). Its on-chain authority
 * is limited to route-and-deposit; it cannot withdraw locked funds early — the chain forbids it.
 */
import type { GuardrailConfig } from "@steward/core";
import { StewardVault, type NetworkName } from "@steward/sdk";
import { consoleAuditSink, fileAuditSink } from "./audit.js";
import { runCycle, type CycleDeps } from "./cycle.js";
import { createAnthropicProposer } from "./llm/proposer.js";
import { assembleContext, type ConfigSignals } from "./signals/index.js";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env var: ${name}`);
  return v;
}

async function main(): Promise<void> {
  const network = (process.env.STACKS_NETWORK ?? "testnet") as NetworkName;
  const vault = new StewardVault({
    network,
    flowvaultContract: required("FLOWVAULT_CONTRACT"),
    tokenContract: required("TOKEN_CONTRACT"),
    stewardRouterContract: required("STEWARD_ROUTER_CONTRACT"),
    senderKey: required("OPERATOR_PRIVATE_KEY"), // server-side only
    senderAddress: required("OPERATOR_STX_ADDRESS"),
  });

  const cfg: GuardrailConfig = {
    allowlist: (process.env.ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    reserveFloor: BigInt(process.env.RESERVE_FLOOR ?? "0"),
    maxPayout: BigInt(process.env.MAX_PAYOUT ?? "0"),
    minLockHorizon: Number(process.env.MIN_LOCK_HORIZON ?? "10"),
  };

  // Config-driven signals for the demo (runway is real; payroll/milestones are config).
  const signals: ConfigSignals = {
    owner: required("OPERATOR_STX_ADDRESS"),
    pendingDeposit: BigInt(process.env.PENDING_DEPOSIT ?? "0"),
    runwayRatio: Number(process.env.RUNWAY_RATIO ?? "1"),
    payrollDue: process.env.PAYROLL_DUE === "true",
    milestones: {},
  };

  const deps: CycleDeps = {
    readContext: () => assembleContext(vault, signals),
    propose: createAnthropicProposer(),
    submit: (rules, ctx) => vault.routeAndDeposit(ctx.pendingDeposit, rules),
    audit: async (entry) => {
      consoleAuditSink()(entry);
      await fileAuditSink("audit-log/steward.jsonl")(entry);
    },
  };

  const intervalMs = Number(process.env.AGENT_CYCLE_INTERVAL_MS ?? "60000");
  console.log(`Steward agent started on ${network}; cycle interval ${intervalMs}ms`);

  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      await runCycle(deps, cfg);
    } catch (err) {
      console.error("cycle failed:", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
