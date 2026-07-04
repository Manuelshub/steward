/**
 * Signal adapters (ARCHITECTURE.md §6, E4.1). Assemble a normalized SignalContext from the
 * real on-chain vault state (via @steward/sdk) plus config-driven signals (payroll calendar,
 * milestone flags, this cycle's pending deposit).
 */
import type { SignalContext } from "@steward/core";
import type { StewardVault } from "@steward/sdk";

export interface ConfigSignals {
  /** The treasury / operator principal whose vault we read. */
  owner: string;
  /** Amount being deposited / routed this cycle (base units). */
  pendingDeposit: bigint;
  /** Estimated runway as a fraction [0,1]. */
  runwayRatio: number;
  /** Whether payroll/ops is due this cycle. */
  payrollDue: boolean;
  /** Named milestone flags. */
  milestones: Readonly<Record<string, boolean>>;
}

/** Read live vault state and combine it with the config signals into a SignalContext. */
export async function assembleContext(vault: StewardVault, signals: ConfigSignals): Promise<SignalContext> {
  const [state, currentBlock] = await Promise.all([
    vault.getVaultState(signals.owner),
    vault.getCurrentBlock(signals.owner),
  ]);
  return {
    owner: signals.owner,
    vault: state,
    currentBlock,
    pendingDeposit: signals.pendingDeposit,
    treasuryBalance: state.lockedBalance + state.unlockedBalance,
    runwayRatio: signals.runwayRatio,
    payrollDue: signals.payrollDue,
    milestones: signals.milestones,
  };
}
