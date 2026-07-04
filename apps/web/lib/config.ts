/** Public runtime config — deployed testnet contracts + on-chain demo evidence. */
export const CONFIG = {
  network: (process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet") as "testnet" | "mainnet",
  flowvault: process.env.NEXT_PUBLIC_FLOWVAULT_CONTRACT ?? "ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.flowvault-v2",
  router: process.env.NEXT_PUBLIC_STEWARD_ROUTER_CONTRACT ?? "ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.steward-router",
  token: process.env.NEXT_PUBLIC_TOKEN_CONTRACT ?? "ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.mock-usdcx",
  apiUrl: "https://api.testnet.hiro.so",
  explorer: "https://explorer.hiro.so",
  // Real on-chain evidence from the live smoke test (docs/deployment.md).
  evidence: {
    deposit: "68d75b9e3cf5d1b8577bff37793282f4dfc397175ff95a7a41f4e0372fe42c76",
    moneyShot: "38032c3b8b781bfeaa2fb9bb77a45ee6f2f8ee814370054158eca9a6c8a8c64e",
    unlockedWithdraw: "faa170c043107d2b4854dd24a248d653ee69a68cc49938b9023ff8aa5fa30ab1",
  },
} as const;

export const USDCX_DECIMALS = 6;

/** Format a micro-unit amount (bigint or number) as a human USDCx string. */
export function formatUsdcx(micro: bigint | number): string {
  const n = typeof micro === "bigint" ? micro : BigInt(Math.trunc(micro));
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function txUrl(txid: string): string {
  const id = txid.startsWith("0x") ? txid : `0x${txid}`;
  return `${CONFIG.explorer}/txid/${id}?chain=${CONFIG.network}`;
}

export function contractUrl(principal: string): string {
  return `${CONFIG.explorer}/txid/${principal}?chain=${CONFIG.network}`;
}

export function addressUrl(address: string): string {
  return `${CONFIG.explorer}/address/${address}?chain=${CONFIG.network}`;
}
