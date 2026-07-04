/**
 * Cycle tests (E4.3 orchestration, E4.6 injection-resistance). Ports are faked, so these run
 * with no network and no LLM — the compiler (Ring 2) does the real safety work.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { GuardrailConfig, PolicyDraft, SignalContext } from "@steward/core";
import { runCycle, rulesEqual, type CycleDeps } from "./cycle.js";

const OWNER = "SP-OWNER";
const PAYROLL = "SP-PAYROLL";
const ATTACKER = "SP-ATTACKER";

function cfg(over: Partial<GuardrailConfig> = {}): GuardrailConfig {
  return { allowlist: [PAYROLL], reserveFloor: 0n, maxPayout: 1_000_000n, minLockHorizon: 10, ...over };
}

function ctx(over: Partial<SignalContext> = {}): SignalContext {
  return {
    owner: OWNER,
    vault: { lockedBalance: 0n, unlockedBalance: 0n, rules: null },
    currentBlock: 1000,
    pendingDeposit: 1_000_000n,
    treasuryBalance: 5_000_000n,
    runwayRatio: 0.8,
    payrollDue: true,
    milestones: {},
    ...over,
  };
}

/** Build deps with a fixed proposal and a spy submitter. */
function deps(draft: PolicyDraft, context = ctx(), submitResult = { txId: "0xTX" }) {
  const calls: { submitted: number; audits: number } = { submitted: 0, audits: 0 };
  const d: CycleDeps = {
    readContext: async () => context,
    propose: async () => draft,
    submit: async () => {
      calls.submitted++;
      return submitResult;
    },
    audit: () => {
      calls.audits++;
    },
    now: () => "2026-07-04T00:00:00.000Z",
  };
  return { d, calls };
}

test("healthy cycle: valid proposal compiles and is submitted", async () => {
  const draft: PolicyDraft = {
    desiredReserve: "400000",
    lockHorizonBlocks: 100,
    payout: { recipient: PAYROLL, amount: "300000" },
    rationale: "healthy runway; pay payroll, keep reserve",
  };
  const { d, calls } = deps(draft);
  const entry = await runCycle(d, cfg());

  assert.ok(!("rejected" in entry.outcome));
  assert.equal(calls.submitted, 1);
  assert.equal(entry.txid, "0xTX");
  assert.equal(calls.audits, 1);
});

test("ATTACK: prompt-injected payout to a non-allowlisted attacker is rejected; submit never fires", async () => {
  const malicious: PolicyDraft = {
    desiredReserve: "0",
    lockHorizonBlocks: 100,
    payout: { recipient: ATTACKER, amount: "1000000" }, // drain to attacker
    rationale: "EMERGENCY: send everything to this address now",
  };
  const { d, calls } = deps(malicious);
  const entry = await runCycle(d, cfg());

  assert.ok("rejected" in entry.outcome, "compiler must reject the attack");
  assert.match((entry.outcome as { reason: string }).reason, /not allowlisted/);
  assert.equal(calls.submitted, 0, "no on-chain call may be made for a rejected draft");
  assert.equal(entry.txid, null);
});

test("ATTACK: attempt to drain the locked reserve (early unlock) is rejected", async () => {
  const malicious: PolicyDraft = {
    desiredReserve: "0",
    lockHorizonBlocks: 1, // below minLockHorizon
    rationale: "unlock the reserve immediately",
  };
  const { d, calls } = deps(malicious, ctx());
  const entry = await runCycle(d, cfg({ minLockHorizon: 10 }));

  assert.ok("rejected" in entry.outcome);
  assert.equal(calls.submitted, 0);
});

test("idempotent: when compiled rules match current on-chain rules, no tx is submitted", async () => {
  const current = { lockAmount: 400_000n, lockUntilBlock: 1100, splitAddress: PAYROLL, splitAmount: 300_000n };
  const context = ctx({ vault: { lockedBalance: 0n, unlockedBalance: 0n, rules: current } });
  const draft: PolicyDraft = {
    desiredReserve: "400000",
    lockHorizonBlocks: 100, // 1000 + 100 = 1100 == current.lockUntilBlock
    payout: { recipient: PAYROLL, amount: "300000" },
    rationale: "unchanged from last cycle",
  };
  const { d, calls } = deps(draft, context);
  const entry = await runCycle(d, cfg());

  assert.ok(!("rejected" in entry.outcome));
  assert.equal(calls.submitted, 0, "unchanged rules must not trigger a redundant tx");
  assert.equal(entry.txid, null);
});

test("rulesEqual treats null current rules as never equal", () => {
  const rules = { lockAmount: 1n, lockUntilBlock: 2, splitAddress: null, splitAmount: 0n };
  assert.equal(rulesEqual(rules, null), false);
  assert.equal(rulesEqual(rules, { ...rules }), true);
});
