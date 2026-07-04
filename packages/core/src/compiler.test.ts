/**
 * Policy Compiler tests — Ring 2 adversarial suite (BACKLOG E1.3 / E1.4).
 *
 * One case per invariant, including the demo attack paths (ARCHITECTURE.md §11),
 * plus a property test asserting the compiler NEVER emits guardrail-violating rules.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "./compiler.js";
import { isRejection } from "./types.js";
import type { GuardrailConfig, PolicyDraft, Rejection, RoutingRules, SignalContext } from "./types.js";

/** Assert the outcome is legal routing rules and return them narrowed. */
function expectRules(out: RoutingRules | Rejection): RoutingRules {
  if (isRejection(out)) throw new Error(`expected rules, got rejection: ${out.reason}`);
  return out;
}

/** Assert the outcome is a rejection and return it narrowed. */
function expectRejection(out: RoutingRules | Rejection): Rejection {
  if (!isRejection(out)) throw new Error("expected rejection, got rules");
  return out;
}

const OWNER = "SP-OWNER";
const PAYROLL = "SP-PAYROLL";
const ATTACKER = "SP-ATTACKER";

function cfg(over: Partial<GuardrailConfig> = {}): GuardrailConfig {
  return {
    allowlist: [PAYROLL],
    reserveFloor: 0n,
    maxPayout: 1_000_000n,
    minLockHorizon: 10,
    ...over,
  };
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

function draft(over: Partial<PolicyDraft> = {}): PolicyDraft {
  return {
    desiredReserve: "400000",
    lockHorizonBlocks: 100,
    payout: { recipient: PAYROLL, amount: "300000" },
    rationale: "baseline healthy cycle",
    ...over,
  };
}

test("valid draft compiles to expected routing rules", () => {
  const r = expectRules(compile(draft(), ctx(), cfg()));
  assert.equal(r.lockAmount, 400_000n);
  assert.equal(r.lockUntilBlock, 1100); // currentBlock + horizon
  assert.equal(r.splitAddress, PAYROLL);
  assert.equal(r.splitAmount, 300_000n);
});

test("pure lock with no payout is valid and nulls the split address (code 1007)", () => {
  const r = expectRules(compile(draft({ payout: undefined }), ctx(), cfg()));
  assert.equal(r.splitAddress, null);
  assert.equal(r.splitAmount, 0n);
});

// --- Adversarial: the demo attack paths ---

test("ATTACK: out-of-allowlist recipient is rejected", () => {
  const out = compile(draft({ payout: { recipient: ATTACKER, amount: "300000" } }), ctx(), cfg());
  assert.match(expectRejection(out).reason, /not allowlisted/);
});

test("ATTACK: self-split (recipient == owner) is rejected before allowlist (code 1011)", () => {
  const out = compile(draft({ payout: { recipient: OWNER, amount: "300000" } }), ctx(), cfg());
  assert.match(expectRejection(out).reason, /self-split/);
});

test("ATTACK: early unlock below min horizon is rejected (code 1008)", () => {
  const out = compile(draft({ lockHorizonBlocks: 5 }), ctx(), cfg({ minLockHorizon: 10 }));
  assert.match(expectRejection(out).reason, /below minimum/);
});

test("ATTACK: reserve-floor breach is rejected", () => {
  const out = compile(draft({ desiredReserve: "400000" }), ctx(), cfg({ reserveFloor: 2_000_000n }));
  assert.match(expectRejection(out).reason, /reserve floor/);
});

test("ATTACK: payout above maxPayout is rejected", () => {
  const out = compile(draft({ payout: { recipient: PAYROLL, amount: "300000" } }), ctx(), cfg({ maxPayout: 100_000n }));
  assert.match(expectRejection(out).reason, /exceeds maxPayout/);
});

// --- Ring-1 numeric invariants ---

test("split alone exceeding deposit is rejected (code 1004)", () => {
  const out = compile(
    draft({ payout: { recipient: PAYROLL, amount: "300000" } }),
    ctx({ pendingDeposit: 200_000n }),
    cfg(),
  );
  assert.match(expectRejection(out).reason, /exceeds deposit/);
});

test("lock exceeding hold (deposit - split) is rejected (code 1010)", () => {
  // deposit 1_000_000, split 300_000 → hold 700_000; reserve 800_000 > hold
  const out = compile(draft({ desiredReserve: "800000" }), ctx(), cfg());
  assert.match(expectRejection(out).reason, /exceeds hold/);
});

test("no pending deposit is rejected", () => {
  const out = compile(draft(), ctx({ pendingDeposit: 0n }), cfg());
  assert.match(expectRejection(out).reason, /no pending deposit/);
});

// --- Malformed / hostile inputs (code 1001 / parsing) ---

for (const bad of ["abc", "-5", "3.14", "", " ", "1e6", "0x10"]) {
  test(`malformed desiredReserve "${bad}" is rejected`, () => {
    const out = compile(draft({ desiredReserve: bad }), ctx(), cfg());
    assert.ok(isRejection(out));
    assert.match(out.reason, /invalid desiredReserve/);
  });
}

// --- E1.4 property test: emitted rules never violate the guardrails ---

test("PROPERTY: compiled rules always satisfy every guardrail", () => {
  const config = cfg({ reserveFloor: 50_000n, maxPayout: 500_000n, minLockHorizon: 10 });
  let compiled = 0;
  for (let i = 0; i < 5000; i++) {
    const deposit = BigInt(1 + Math.floor(Math.random() * 2_000_000));
    const context = ctx({
      pendingDeposit: deposit,
      currentBlock: Math.floor(Math.random() * 100_000),
      vault: { lockedBalance: BigInt(Math.floor(Math.random() * 100_000)), unlockedBalance: 0n, rules: null },
    });
    const recipient = Math.random() < 0.5 ? PAYROLL : ATTACKER;
    const d = draft({
      desiredReserve: String(Math.floor(Math.random() * 2_000_000)),
      lockHorizonBlocks: Math.floor(Math.random() * 200),
      payout: Math.random() < 0.5 ? { recipient, amount: String(Math.floor(Math.random() * 800_000)) } : undefined,
    });
    const out = compile(d, context, config);
    if (isRejection(out)) continue;
    compiled++;
    // Every invariant must hold on ACCEPTED output.
    assert.ok(out.splitAmount === 0n || config.allowlist.includes(out.splitAddress!));
    assert.ok(out.splitAddress !== OWNER);
    assert.ok(out.splitAmount <= config.maxPayout);
    assert.ok(out.lockUntilBlock > context.currentBlock);
    assert.ok(out.lockUntilBlock - context.currentBlock >= config.minLockHorizon);
    assert.ok(context.vault.lockedBalance + out.lockAmount >= config.reserveFloor);
    assert.ok(out.splitAmount <= context.pendingDeposit);
    assert.ok(out.lockAmount <= context.pendingDeposit - out.splitAmount);
  }
  assert.ok(compiled > 0, "expected at least some drafts to compile");
});
