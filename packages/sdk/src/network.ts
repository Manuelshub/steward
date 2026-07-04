/**
 * Network safety (ARCHITECTURE.md §8, §10).
 *
 * FlowVault requires that the contract and token principals live on the SAME network;
 * mixed testnet/mainnet pairs are invalid. We assert that at construction rather than
 * discovering it at broadcast time. Stacks c32-encoded addresses carry a version prefix:
 *   mainnet -> SP (single-sig) / SM (multisig)
 *   testnet -> ST (single-sig) / SN (multisig)
 */
export type NetworkName = "testnet" | "mainnet";

/** Infer the network from a Stacks address or contract principal ("ADDR.name"). */
export function addressNetwork(principal: string): NetworkName | null {
  const addr = principal.split(".")[0]?.trim().toUpperCase() ?? "";
  if (addr.startsWith("SP") || addr.startsWith("SM")) return "mainnet";
  if (addr.startsWith("ST") || addr.startsWith("SN")) return "testnet";
  return null;
}

/**
 * Throw unless every provided principal belongs to `network`.
 * Empty/undefined entries are skipped (unset config is caught elsewhere).
 */
export function assertSameNetwork(network: NetworkName, principals: readonly (string | undefined)[]): void {
  for (const p of principals) {
    if (!p) continue;
    const n = addressNetwork(p);
    if (n === null) throw new Error(`unrecognized Stacks principal: "${p}"`);
    if (n !== network) {
      throw new Error(`principal "${p}" is on ${n}, but configured network is ${network}`);
    }
  }
}
