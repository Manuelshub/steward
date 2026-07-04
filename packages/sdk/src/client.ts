/**
 * StewardVault — the typed client Steward's agent + web use (ARCHITECTURE.md §2, §8).
 *
 * Wraps flowvault-sdk's FlowVault for reads/base ops and (in E3.3) the steward-router
 * extension for guarded routing. All amounts cross the boundary as @steward/core bigints.
 */
import {
  broadcastTransaction,
  cvToValue,
  fetchCallReadOnlyFunction,
  makeContractCall,
  PostConditionMode,
  type ClarityValue,
  type PostCondition,
} from "@stacks/transactions";
import { FlowVault } from "flowvault-sdk";
import type { RoutingRules, VaultState } from "@steward/core";
import {
  addRecipientArgs,
  isAllowlistedArgs,
  removeRecipientArgs,
  routeAndDepositArgs,
  setReserveFloorArgs,
  transferOwnershipArgs,
} from "./args.js";
import { toCoreVaultState } from "./convert.js";
import { assertSameNetwork, type NetworkName } from "./network.js";

/** Options for a state-changing steward-router call. */
export interface WriteOptions {
  fee?: bigint | number;
  nonce?: bigint | number;
  postConditions?: PostCondition[];
  postConditionMode?: PostConditionMode;
}

export interface StewardConfig {
  network: NetworkName;
  /** FlowVault base contract, "ADDR.name". */
  flowvaultContract: string;
  /** USDCx SIP-010 token, "ADDR.name". */
  tokenContract: string;
  /** steward-router extension, "ADDR.name". Set after deploy (E2.7); optional for read-only use. */
  stewardRouterContract?: string;
  /** Operator private key — SERVER-ONLY (apps/agent). Never in the browser. */
  senderKey?: string;
  /** Sender address for read-only calls / wallet mode. */
  senderAddress?: string;
}

/** Split an "ADDR.name" contract principal into its parts. */
export function splitPrincipal(principal: string): { address: string; name: string } {
  const [address, name] = principal.split(".");
  if (!address || !name) throw new Error(`expected "ADDR.name" contract principal, got "${principal}"`);
  return { address, name };
}

export class StewardVault {
  private readonly flow: FlowVault;
  readonly config: StewardConfig;

  constructor(config: StewardConfig) {
    // E3.1: reject mixed-network principals before any call is built.
    assertSameNetwork(config.network, [
      config.flowvaultContract,
      config.tokenContract,
      config.stewardRouterContract,
      config.senderAddress,
    ]);
    const fv = splitPrincipal(config.flowvaultContract);
    const tok = splitPrincipal(config.tokenContract);
    this.flow = new FlowVault({
      network: config.network,
      contractAddress: fv.address,
      contractName: fv.name,
      tokenContractAddress: tok.address,
      tokenContractName: tok.name,
      senderKey: config.senderKey,
      senderAddress: config.senderAddress,
    });
    this.config = config;
  }

  /** E3.2 read path: vault state in core (bigint) types. */
  async getVaultState(userAddress: string): Promise<VaultState> {
    return toCoreVaultState(await this.flow.getVaultState(userAddress));
  }

  /** Current chain height — for computing a valid future lockUntilBlock. */
  async getCurrentBlock(senderAddress: string): Promise<number> {
    return this.flow.getCurrentBlockHeight(senderAddress);
  }

  /** Escape hatch to the underlying flowvault-sdk instance for base operations. */
  get flowVault(): FlowVault {
    return this.flow;
  }

  // --- E3.3 steward-router write path ---
  // Broadcasting requires a deployed stewardRouterContract + operator senderKey (server-side).
  // The Clarity arg encoding is unit-tested in args.test.ts; only broadcast is network-bound.

  /** The single guarded entry the agent uses: validate (allowlist/floor) then deposit. */
  async routeAndDeposit(amount: bigint, rules: RoutingRules, opts?: WriteOptions): Promise<{ txId: string }> {
    return this.broadcastStewardCall(
      "route-and-deposit",
      routeAndDepositArgs(this.config.tokenContract, amount, rules),
      opts,
    );
  }

  /** Owner-only: add a principal to the payout allowlist. */
  addRecipient(who: string, opts?: WriteOptions): Promise<{ txId: string }> {
    return this.broadcastStewardCall("add-recipient", addRecipientArgs(who), opts);
  }

  /** Owner-only: remove a principal from the allowlist. */
  removeRecipient(who: string, opts?: WriteOptions): Promise<{ txId: string }> {
    return this.broadcastStewardCall("remove-recipient", removeRecipientArgs(who), opts);
  }

  /** Owner-only: set the reserve floor (minimum locked). */
  setReserveFloor(amount: bigint, opts?: WriteOptions): Promise<{ txId: string }> {
    return this.broadcastStewardCall("set-reserve-floor", setReserveFloorArgs(amount), opts);
  }

  /** Owner-only: hand ownership to a new principal. */
  transferOwnership(newOwner: string, opts?: WriteOptions): Promise<{ txId: string }> {
    return this.broadcastStewardCall("transfer-ownership", transferOwnershipArgs(newOwner), opts);
  }

  // --- steward-router reads ---

  async isAllowlisted(who: string): Promise<boolean> {
    return cvToValue(await this.readSteward("is-allowlisted", isAllowlistedArgs(who))) as boolean;
  }

  async getReserveFloor(): Promise<bigint> {
    return BigInt(cvToValue(await this.readSteward("get-reserve-floor", [])) as bigint | number | string);
  }

  async getOwner(): Promise<string> {
    return cvToValue(await this.readSteward("get-owner", [])) as string;
  }

  // --- internals ---

  private requireRouter(): string {
    if (!this.config.stewardRouterContract) {
      throw new Error("stewardRouterContract is not configured (deploy steward-router first, E2.7)");
    }
    return this.config.stewardRouterContract;
  }

  private requireSenderKey(): string {
    if (!this.config.senderKey) throw new Error("senderKey is required for state-changing calls");
    return this.config.senderKey;
  }

  private async broadcastStewardCall(
    functionName: string,
    functionArgs: ClarityValue[],
    opts?: WriteOptions,
  ): Promise<{ txId: string }> {
    const { address, name } = splitPrincipal(this.requireRouter());
    const transaction = await makeContractCall({
      contractAddress: address,
      contractName: name,
      functionName,
      functionArgs,
      senderKey: this.requireSenderKey(),
      network: this.config.network,
      postConditionMode: opts?.postConditionMode ?? PostConditionMode.Allow,
      postConditions: opts?.postConditions ?? [],
      fee: opts?.fee,
      nonce: opts?.nonce,
    });
    const res = await broadcastTransaction({ transaction, network: this.config.network });
    if ("error" in res && res.error) {
      throw new Error(`broadcast failed: ${res.error}${res.reason ? ` (${res.reason})` : ""}`);
    }
    return { txId: res.txid };
  }

  private async readSteward(functionName: string, functionArgs: ClarityValue[]): Promise<ClarityValue> {
    const { address, name } = splitPrincipal(this.requireRouter());
    return fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName,
      functionArgs,
      senderAddress: this.config.senderAddress ?? address,
      network: this.config.network,
    });
  }
}
