/**
 * Steward core types — the contracts between layers.
 *
 * These interfaces are the authoritative boundary definitions referenced by
 * ARCHITECTURE.md §7. Everything crossing a layer boundary is one of these shapes.
 *
 * IMPORTANT: token amounts are always `bigint` in-process and serialized as
 * decimal strings at the edges. Never a JS `number` (see ARCHITECTURE.md §10).
 */

/** Absolute Stacks chain height. */
export type BlockHeight = number;

/** A Stacks principal (standard or contract), e.g. "SP...". */
export type Principal = string;

/**
 * Normalized snapshot the agent reasons over. Assembled by the signal adapters
 * (apps/agent) from on-chain state + configured/mocked signals.
 */
export interface SignalContext {
  /** Current on-chain vault state (mirror of get-vault-state). */
  readonly vault: VaultState;
  /** Current chain tip height — basis for any lockUntilBlock decision. */
  readonly currentBlock: BlockHeight;
  /** Total treasury value under management (base units). */
  readonly treasuryBalance: bigint;
  /** Estimated runway as a fraction [0,1]; 1 = fully funded target reserve. */
  readonly runwayRatio: number;
  /** Whether a payroll/ops payout is due this cycle. */
  readonly payrollDue: boolean;
  /** Named milestone flags that a policy may react to. */
  readonly milestones: Readonly<Record<string, boolean>>;
}

/**
 * The LLM's UNTRUSTED proposal (Ring 3). Structured output only — never executed
 * as free-form text. Amounts arrive as strings and are parsed by the compiler.
 */
export interface PolicyDraft {
  /** Desired amount to keep locked as reserve (base units, decimal string). */
  readonly desiredReserve: string;
  /** How many blocks from now the reserve should stay locked. */
  readonly lockHorizonBlocks: number;
  /** Intended payout to a (claimed) recipient this cycle. */
  readonly payout?: {
    readonly recipient: Principal;
    readonly amount: string;
  };
  /** Model's short rationale — for the audit trail only, never trusted for control flow. */
  readonly rationale: string;
}

/**
 * The COMPILED, legal output (Ring 2 result). Maps 1:1 to FlowVault
 * set-routing-rules(lockAmount, lockUntilBlock, splitAddress, splitAmount).
 */
export interface RoutingRules {
  readonly lockAmount: bigint;
  readonly lockUntilBlock: BlockHeight;
  readonly splitAddress: Principal | null;
  readonly splitAmount: bigint;
}

/** Returned by the compiler when a draft cannot be made legal. */
export interface Rejection {
  readonly rejected: true;
  readonly reason: string;
}

/** Mirror of get-vault-state. */
export interface VaultState {
  readonly lockedBalance: bigint;
  readonly unlockedBalance: bigint;
  readonly rules: RoutingRules | null;
}

/**
 * Guardrail configuration — the fixed policy limits the compiler clamps against
 * (Ring 2) and that the on-chain extension mirrors (Ring 1). Owner-controlled,
 * NOT agent-controlled.
 */
export interface GuardrailConfig {
  /** Recipients the agent is permitted to route to. Anything else is rejected. */
  readonly allowlist: readonly Principal[];
  /** Minimum amount that must remain locked (reserve floor). */
  readonly reserveFloor: bigint;
  /** Maximum single-cycle payout (base units). */
  readonly maxPayout: bigint;
  /** Minimum blocks a reserve lock must extend into the future. */
  readonly minLockHorizon: number;
}

/** One full agent cycle, recorded for the audit trail (ARCHITECTURE.md §6). */
export interface AuditEntry {
  readonly timestamp: string;
  readonly context: SignalContext;
  readonly draft: PolicyDraft;
  readonly outcome: RoutingRules | Rejection;
  readonly txid: string | null;
}

export function isRejection(x: RoutingRules | Rejection): x is Rejection {
  return (x as Rejection).rejected === true;
}
