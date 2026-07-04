import assert from "node:assert/strict";
import { test } from "node:test";
import type { RoutingRules as SdkRoutingRules, VaultState as SdkVaultState } from "flowvault-sdk";
import { microToBig, toCoreRoutingRules, toCoreVaultState, toSdkRoutingRules } from "./convert.js";

test("microToBig accepts number, bigint, and string integers", () => {
  assert.equal(microToBig(1_000_000), 1_000_000n);
  assert.equal(microToBig(1_000_000n), 1_000_000n);
  assert.equal(microToBig("1000000"), 1_000_000n);
  assert.equal(microToBig(0), 0n);
});

test("microToBig rejects non-integer, unsafe, and malformed inputs", () => {
  assert.throws(() => microToBig(3.14), /not an integer/);
  assert.throws(() => microToBig(Number.MAX_SAFE_INTEGER + 1), /safe integer range/);
  assert.throws(() => microToBig("12x"), /invalid micro-amount/);
  assert.throws(() => microToBig("-5"), /invalid micro-amount/);
});

test("toCoreRoutingRules returns null for the default hold-all (zero lock + zero split)", () => {
  const zero: SdkRoutingRules = { lockAmount: 0, lockUntilBlock: 0, splitAddress: null, splitAmount: 0 };
  assert.equal(toCoreRoutingRules(zero), null);
});

test("toCoreRoutingRules converts amounts to bigint and preserves block/address", () => {
  const r: SdkRoutingRules = {
    lockAmount: 400_000,
    lockUntilBlock: 12345,
    splitAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    splitAmount: 300_000,
  };
  const core = toCoreRoutingRules(r);
  assert.deepEqual(core, {
    lockAmount: 400_000n,
    lockUntilBlock: 12345,
    splitAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    splitAmount: 300_000n,
  });
});

test("toCoreVaultState converts balances to bigint", () => {
  const s: SdkVaultState = {
    totalBalance: 700_000,
    lockedBalance: 400_000,
    unlockedBalance: 300_000,
    lockUntilBlock: 12345,
    currentBlock: 12000,
    routingRules: { lockAmount: 400_000, lockUntilBlock: 12345, splitAddress: null, splitAmount: 0 },
  };
  const core = toCoreVaultState(s);
  assert.equal(core.lockedBalance, 400_000n);
  assert.equal(core.unlockedBalance, 300_000n);
  assert.equal(core.rules?.lockAmount, 400_000n);
});

test("toSdkRoutingRules round-trips core bigint amounts back out", () => {
  const sdk = toSdkRoutingRules({ lockAmount: 400_000n, lockUntilBlock: 99, splitAddress: null, splitAmount: 0n });
  assert.equal(sdk.lockAmount, 400_000n);
  assert.equal(sdk.lockUntilBlock, 99);
  assert.equal(sdk.splitAmount, 0n);
});
