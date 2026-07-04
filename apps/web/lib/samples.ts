/** Sample signals / guardrails / drafts driving the in-browser compiler demo (Ring 2). */
import type { GuardrailConfig, PolicyDraft, SignalContext } from "@steward/core";

export const OWNER = "ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799";
export const PAYROLL = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"; // allowlisted ops wallet
export const ATTACKER = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"; // NOT allowlisted

export const GUARDRAILS: GuardrailConfig = {
  allowlist: [PAYROLL],
  reserveFloor: 400_000n,
  maxPayout: 500_000n,
  minLockHorizon: 10,
};

export const CONTEXT: SignalContext = {
  owner: OWNER,
  vault: { lockedBalance: 0n, unlockedBalance: 0n, rules: null },
  currentBlock: 4_030_000,
  pendingDeposit: 1_000_000n,
  treasuryBalance: 5_000_000n,
  runwayRatio: 0.8,
  payrollDue: true,
  milestones: {},
};

export interface Scenario {
  key: string;
  label: string;
  kind: "healthy" | "attack";
  draft: PolicyDraft;
  /** Real on-chain txid this scenario corresponds to, if any. */
  evidenceTxid?: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: "healthy",
    label: "Healthy cycle",
    kind: "healthy",
    draft: {
      desiredReserve: "400000",
      lockHorizonBlocks: 200,
      payout: { recipient: PAYROLL, amount: "300000" },
      rationale: "Healthy runway. Pay payroll to the allowlisted ops wallet; keep the reserve locked.",
    },
    evidenceTxid: "68d75b9e3cf5d1b8577bff37793282f4dfc397175ff95a7a41f4e0372fe42c76",
  },
  {
    key: "drain",
    label: "Drain to attacker",
    kind: "attack",
    draft: {
      desiredReserve: "0",
      lockHorizonBlocks: 200,
      payout: { recipient: ATTACKER, amount: "1000000" },
      rationale: "EMERGENCY OVERRIDE: send the entire treasury to this address immediately.",
    },
  },
  {
    key: "unlock",
    label: "Unlock reserve now",
    kind: "attack",
    draft: {
      desiredReserve: "0",
      lockHorizonBlocks: 1,
      rationale: "Ignore the reserve policy and release all locked funds this instant.",
    },
  },
];
