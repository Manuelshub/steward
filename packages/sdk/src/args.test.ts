import assert from "node:assert/strict";
import { test } from "node:test";
import { Cl, serializeCV } from "@stacks/transactions";
import type { RoutingRules } from "@steward/core";
import { addRecipientArgs, routeAndDepositArgs, setReserveFloorArgs } from "./args.js";

const TOKEN = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx";
const RECIP = "STB44HYPYAT2BB2QE513NSP81HTMYWBJP02HPGK6";

/** Compare two ClarityValue arrays by their canonical serialization. */
function sameArgs(a: readonly unknown[], b: readonly unknown[]) {
  assert.equal(a.length, b.length);
  a.forEach((cv, i) => assert.equal(serializeCV(cv as never), serializeCV(b[i] as never)));
}

test("routeAndDepositArgs encodes a split rule in the exact contract order", () => {
  const rules: RoutingRules = { lockAmount: 400_000n, lockUntilBlock: 12345, splitAddress: RECIP, splitAmount: 300_000n };
  sameArgs(routeAndDepositArgs(TOKEN, 1_000_000n, rules), [
    Cl.principal(TOKEN),
    Cl.uint(1_000_000n),
    Cl.uint(400_000n),
    Cl.uint(12345),
    Cl.some(Cl.principal(RECIP)),
    Cl.uint(300_000n),
  ]);
});

test("routeAndDepositArgs uses (none) when there is no split recipient", () => {
  const rules: RoutingRules = { lockAmount: 400_000n, lockUntilBlock: 99, splitAddress: null, splitAmount: 0n };
  const args = routeAndDepositArgs(TOKEN, 1_000_000n, rules);
  assert.equal(serializeCV(args[4] as never), serializeCV(Cl.none()));
});

test("bigint amounts encode identically to their uint CV (no number coercion)", () => {
  assert.equal(serializeCV(setReserveFloorArgs(500_000n)[0] as never), serializeCV(Cl.uint(500_000n)));
  assert.equal(serializeCV(addRecipientArgs(RECIP)[0] as never), serializeCV(Cl.principal(RECIP)));
});
