/**
 * Policy Compiler — Ring 2, the deterministic guardrail (ARCHITECTURE.md §3, §7).
 *
 * Pure function. NO network, NO keys, NO I/O. Takes the LLM's untrusted PolicyDraft
 * and either clamps it into legal RoutingRules or rejects it. This is the leash on the AI
 * and the most heavily-tested unit in the codebase.
 *
 * Each invariant mirrors a real flowvault-v2 on-chain error code (docs/flowvault-notes.md)
 * plus Steward's own extension guarantees (allowlist, reserve floor, max payout).
 */
import type {
  GuardrailConfig,
  PolicyDraft,
  Rejection,
  RoutingRules,
  SignalContext,
} from "./types.js";

/** Parse a decimal-string / bigint amount to a non-negative bigint, or null if invalid. */
function parseAmount(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null; // digits only → no signs, decimals, or junk
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function reject(reason: string): Rejection {
  return { rejected: true, reason };
}

/**
 * Compile an untrusted draft into legal routing rules, or reject it.
 *
 * Ordering note: allowlist / recipient checks run BEFORE numeric clamping so an
 * out-of-allowlist recipient is always reported as such (the demo attack), never masked
 * by an amount error.
 */
export function compile(
  draft: PolicyDraft,
  ctx: SignalContext,
  cfg: GuardrailConfig,
): RoutingRules | Rejection {
  // --- Parse amounts (code 1001 / 1009 mirror) ---
  const reserve = parseAmount(draft.desiredReserve);
  if (reserve === null) return reject(`invalid desiredReserve: ${draft.desiredReserve}`);

  const deposit = ctx.pendingDeposit;
  if (deposit <= 0n) return reject("no pending deposit to route this cycle");

  // --- Resolve payout (split) intent ---
  let splitAddress: string | null = null;
  let splitAmount = 0n;

  if (draft.payout) {
    const payout = parseAmount(draft.payout.amount);
    if (payout === null) return reject(`invalid payout amount: ${draft.payout.amount}`);

    if (payout > 0n) {
      // Ring-1 code 1011: cannot split to yourself.
      if (draft.payout.recipient === ctx.owner) {
        return reject("payout recipient cannot be the vault owner (self-split)");
      }
      // Steward extension: recipient must be on the owner-set allowlist.
      if (!cfg.allowlist.includes(draft.payout.recipient)) {
        return reject(`recipient not allowlisted: ${draft.payout.recipient}`);
      }
      // Steward guardrail: single-cycle payout cap.
      if (payout > cfg.maxPayout) {
        return reject(`payout ${payout} exceeds maxPayout ${cfg.maxPayout}`);
      }
      splitAddress = draft.payout.recipient;
      splitAmount = payout;
    }
    // payout == 0 → treated as no split; splitAddress stays null (code 1007 satisfied).
  }

  // --- Lock horizon (code 1008 mirror: must be a strictly future block) ---
  const horizon = Math.trunc(draft.lockHorizonBlocks);
  if (!Number.isFinite(horizon) || horizon < cfg.minLockHorizon) {
    return reject(
      `lock horizon ${draft.lockHorizonBlocks} below minimum ${cfg.minLockHorizon} blocks`,
    );
  }
  const lockUntilBlock = ctx.currentBlock + horizon;
  if (lockUntilBlock <= ctx.currentBlock) {
    return reject("lockUntilBlock must be in the future");
  }

  // --- Reserve floor (Steward extension): the amount we lock this cycle plus any already-locked
  //     balance must keep the vault at or above the owner-set floor. ---
  const lockAmount = reserve;
  const projectedLocked = ctx.vault.lockedBalance + lockAmount;
  if (projectedLocked < cfg.reserveFloor) {
    return reject(
      `projected locked ${projectedLocked} below reserve floor ${cfg.reserveFloor}`,
    );
  }

  // --- Ring-1 code 1004: the split portion alone cannot exceed the deposit ---
  if (splitAmount > deposit) {
    return reject(`split(${splitAmount}) exceeds deposit(${deposit})`);
  }

  // --- Ring-1 code 1010: lock must not exceed hold (deposit − split) ---
  const hold = deposit - splitAmount;
  if (lockAmount > hold) {
    return reject(`lock(${lockAmount}) exceeds hold(${hold})`);
  }

  return { lockAmount, lockUntilBlock, splitAddress, splitAmount };
}
