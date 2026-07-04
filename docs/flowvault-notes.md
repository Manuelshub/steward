# FlowVault ground truth (E0.1 / E0.2)

Verified against the published **`flowvault-sdk@0.1.2`** package (inspected via `npm pack`).
This is the authoritative reference for the SDK/contract interface. ARCHITECTURE.md §4 defers to this.

## Package

- npm: `flowvault-sdk@0.1.2` — *"TypeScript SDK for FlowVault — Programmable USDCx Routing on Stacks."*
- Deps: `@stacks/transactions ^7.4`, `@stacks/network ^7.3`.
- Entry: `dist/index.js`, types `dist/index.d.ts`.

## Testnet contract principals (DEFAULT_CONTRACTS)

| Role | Address | Name |
|---|---|---|
| FlowVault | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD` | `flowvault-v2` |
| USDCx (SIP-010) | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM` | `usdcx` |

Mainnet addresses are blank in the SDK (testnet-only for the bounty). USDCx = **6 decimals**;
1 USDCx = 1_000_000 micro-units. `MicroAmount = bigint | number | string`.

## `FlowVault` class — methods

Writes (need `senderKey` **or** a `contractCallExecutor` for wallet signing):
- `setRoutingRules(rules, options?)` / `createStrategy(rules, options?)` (alias)
- `deposit(amount, options?)`
- `withdraw(amount, options?)`
- `clearRoutingRules(options?)`

Reads (no key; pass a `senderAddress`):
- `getVaultState(userAddress) → VaultState`
- `getRoutingRules(userAddress) → RoutingRules | null`
- `hasLockedFunds(userAddress) → boolean`
- `getCurrentBlockHeight(senderAddress) → number`

## Key shapes

```ts
RoutingRules { lockAmount: MicroAmount; lockUntilBlock: number;
               splitAddress: string | null; splitAmount: MicroAmount }
VaultState   { totalBalance; lockedBalance; unlockedBalance; lockUntilBlock;
               currentBlock; routingRules }   // amounts are `number` micro-units
FlowVaultConfig { network; contractAddress?; contractName?; senderKey?;
                  tokenContractAddress?; tokenContractName?;
                  contractCallExecutor?; senderAddress?; postConditions?; ... }
```

- `splitAddress` **must be `null`** when `splitAmount` is 0.
- `contractCallExecutor(request) => Promise<unknown>` → browser wallet signing via `@stacks/connect`
  without exposing a private key. **This is how `apps/web` signs; `apps/agent` uses `senderKey`.**

## On-chain error codes (ERROR_CODE_MAP) — the real invariants

| Code | Meaning | Ring-2 mirror in compiler |
|---|---|---|
| 1000 | Not authorized | principal-gated |
| 1001 | Invalid amount — must be > 0 | reject non-positive |
| 1002 | Insufficient balance | — (runtime) |
| **1003** | **Funds are currently locked** | **the money-shot abort (§11)** |
| 1004 | Routing amounts exceed deposit | `split + lock <= deposit` |
| 1005 | Token transfer failed | — (runtime) |
| 1006 | No vault configuration found | — |
| 1007 | Split address required when split > 0 | require `splitAddress` iff `splitAmount>0` |
| 1008 | Invalid lock block — must be future | `lockUntilBlock > currentBlock` |
| 1009 | Arithmetic overflow | bounded amounts |
| **1010** | **Lock amount exceeds hold (deposit − split)** | `lockAmount <= deposit − splitAmount` |
| **1011** | **Cannot split to yourself** | `splitAddress != owner` |

## Consequences for Steward

1. The **base `flowvault-v2` contract already enforces** future-lock, split-required, routing≤deposit,
   lock≤hold, no-self-split, and locked-funds withdrawal blocking. Our compiler (Ring 2) **mirrors**
   these so bad drafts are rejected early; the chain (Ring 1) is the backstop.
2. `steward-router`'s **unique** on-chain value is therefore precisely the **allowlist** + **reserve
   floor** — the two guarantees the base contract does *not* provide. Keeps E2 tightly scoped.
3. Wallet vs. key custody is a first-class SDK feature (`contractCallExecutor` vs `senderKey`),
   matching ARCHITECTURE.md §3 exactly.
