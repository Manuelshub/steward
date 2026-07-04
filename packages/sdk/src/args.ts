/**
 * Clarity argument builders for steward-router calls (E3.3).
 *
 * Pure: core types in, ClarityValue[] out. `Cl.uint` takes bigint directly, so amounts
 * never pass through `number`. Keeping these separate makes the encoding unit-testable
 * without a network (broadcasting is the only network-bound step, in client.ts).
 */
import { Cl, type ClarityValue } from "@stacks/transactions";
import type { RoutingRules } from "@steward/core";

/** Args for `route-and-deposit (token, amount, lock-amount, lock-until-block, split-address, split-amount)`. */
export function routeAndDepositArgs(tokenContract: string, amount: bigint, rules: RoutingRules): ClarityValue[] {
  return [
    Cl.principal(tokenContract),
    Cl.uint(amount),
    Cl.uint(rules.lockAmount),
    Cl.uint(rules.lockUntilBlock),
    rules.splitAddress ? Cl.some(Cl.principal(rules.splitAddress)) : Cl.none(),
    Cl.uint(rules.splitAmount),
  ];
}

export const addRecipientArgs = (who: string): ClarityValue[] => [Cl.principal(who)];
export const removeRecipientArgs = (who: string): ClarityValue[] => [Cl.principal(who)];
export const setReserveFloorArgs = (amount: bigint): ClarityValue[] => [Cl.uint(amount)];
export const transferOwnershipArgs = (newOwner: string): ClarityValue[] => [Cl.principal(newOwner)];
export const isAllowlistedArgs = (who: string): ClarityValue[] => [Cl.principal(who)];
