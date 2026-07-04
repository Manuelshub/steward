/** Chain reads (live vault state) and wallet-signed writes. Read-only calls need no wallet. */
import { request } from "@stacks/connect";
import { Cl, cvToValue, fetchCallReadOnlyFunction, type ClarityValue } from "@stacks/transactions";
import { CONFIG } from "./config";

export interface VaultView {
  totalBalance: bigint;
  lockedBalance: bigint;
  unlockedBalance: bigint;
  lockUntilBlock: bigint;
  currentBlock: bigint;
}

function split(id: string): { address: string; name: string } {
  const [address, name] = id.split(".");
  return { address, name };
}

/** Read a user's live vault state from the deployed flowvault-v2 (no wallet needed). */
export async function readVaultState(userAddress: string): Promise<VaultView> {
  const { address, name } = split(CONFIG.flowvault);
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: "get-vault-state",
    functionArgs: [Cl.principal(userAddress)],
    senderAddress: userAddress,
    network: CONFIG.network,
  });
  const v = cvToValue(cv, true) as Record<string, unknown>;
  const big = (k: string) => BigInt((v[k] ?? 0) as string | number | bigint);
  return {
    totalBalance: big("total-balance"),
    lockedBalance: big("locked-balance"),
    unlockedBalance: big("unlocked-balance"),
    lockUntilBlock: big("lock-until-block"),
    currentBlock: big("current-block"),
  };
}

/** Read the steward-router reserve floor (no wallet needed). */
export async function readReserveFloor(sender: string): Promise<bigint> {
  const { address, name } = split(CONFIG.router);
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: "get-reserve-floor",
    functionArgs: [],
    senderAddress: sender,
    network: CONFIG.network,
  });
  return BigInt(cvToValue(cv, true) as string | number | bigint);
}

/** Current testnet Stacks block height. */
export async function fetchHeight(): Promise<number> {
  const r = await fetch(`${CONFIG.apiUrl}/v2/info`);
  const j = (await r.json()) as { stacks_tip_height: number };
  return j.stacks_tip_height;
}

/** Wallet-signed contract call via @stacks/connect. Returns the broadcast txid. */
async function callContract(contract: string, functionName: string, functionArgs: ClarityValue[]): Promise<string> {
  // `as never` shields the build from @stacks/connect v8 param-typing nuances; the runtime shape is correct.
  const res = (await request("stx_callContract", {
    contract,
    functionName,
    functionArgs,
    network: CONFIG.network,
    postConditionMode: "allow",
  } as never)) as { txid?: string; txId?: string };
  return res.txid ?? res.txId ?? "";
}

/** Mint test USDCx to the connected wallet (mock-usdcx is a test token with a public mint). */
export function mintTestTokens(recipient: string, amount: bigint): Promise<string> {
  return callContract(CONFIG.token, "mint", [Cl.uint(amount), Cl.principal(recipient)]);
}

/** Run a guarded route-and-deposit through steward-router (lock a reserve, optional split). */
export function routeAndDeposit(opts: {
  amount: bigint;
  lock: bigint;
  lockUntil: number;
  recipient?: string;
  split?: bigint;
}): Promise<string> {
  return callContract(CONFIG.router, "route-and-deposit", [
    Cl.principal(CONFIG.token),
    Cl.uint(opts.amount),
    Cl.uint(opts.lock),
    Cl.uint(opts.lockUntil),
    opts.recipient ? Cl.some(Cl.principal(opts.recipient)) : Cl.none(),
    Cl.uint(opts.split ?? 0n),
  ]);
}
