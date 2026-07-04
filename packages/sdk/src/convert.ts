/**
 * Value conversion between flowvault-sdk shapes and @steward/core types (ARCHITECTURE.md §7, §10).
 *
 * The SDK returns balances as JS `number` (micro-units). We convert to `bigint` at this
 * boundary so no `number` amount ever flows deeper into Steward. Writes go the other way:
 * core `bigint` amounts are accepted directly by the SDK's `MicroAmount` (bigint | number | string).
 */
import type { RoutingRules, VaultState } from "@steward/core";
import type { RoutingRules as SdkRoutingRules, VaultState as SdkVaultState } from "flowvault-sdk";

/** Convert an SDK micro-amount (number | bigint | string) to an exact bigint. */
export function microToBig(n: number | bigint | string): bigint {
  if (typeof n === "bigint") return n;
  if (typeof n === "string") {
    if (!/^\d+$/.test(n.trim())) throw new Error(`invalid micro-amount string: "${n}"`);
    return BigInt(n.trim());
  }
  if (!Number.isInteger(n)) throw new Error(`micro-amount is not an integer: ${n}`);
  if (!Number.isSafeInteger(n)) throw new Error(`micro-amount exceeds safe integer range: ${n}`);
  return BigInt(n);
}

/** SDK routing rules -> core RoutingRules, or null when no routing is configured. */
export function toCoreRoutingRules(r: SdkRoutingRules): RoutingRules | null {
  const lockAmount = microToBig(r.lockAmount);
  const splitAmount = microToBig(r.splitAmount);
  if (lockAmount === 0n && splitAmount === 0n) return null; // default hold-all == no rules
  return {
    lockAmount,
    lockUntilBlock: r.lockUntilBlock,
    splitAddress: r.splitAddress,
    splitAmount,
  };
}

/** SDK vault state -> core VaultState (bigint balances). */
export function toCoreVaultState(s: SdkVaultState): VaultState {
  return {
    lockedBalance: microToBig(s.lockedBalance),
    unlockedBalance: microToBig(s.unlockedBalance),
    rules: toCoreRoutingRules(s.routingRules),
  };
}

/** Core RoutingRules -> the SDK's set-routing-rules argument shape (amounts kept as bigint). */
export function toSdkRoutingRules(r: RoutingRules): SdkRoutingRules {
  return {
    lockAmount: r.lockAmount,
    lockUntilBlock: r.lockUntilBlock,
    splitAddress: r.splitAddress,
    splitAmount: r.splitAmount,
  };
}
