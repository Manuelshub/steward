# FlowVault integration write-up

How Steward integrates with FlowVault — at the Clarity, SDK, and primitive levels.

## 1. It builds directly on the FlowVault contract

Steward's on-chain layer, [`steward-router.clar`](../packages/contracts/contracts/steward-router.clar),
is a **Clarity extension that composes over the real FlowVault contract** (`flowvault-v2`). Its single
entry point, `route-and-deposit`, forwards to FlowVault after running Steward's own guards:

```clarity
(define-public (route-and-deposit (token <ft-trait>) (amount uint) (lock-amount uint)
                                  (lock-until-block uint) (split-address (optional principal)) (split-amount uint))
  (begin
    (try! (validate-recipient split-address split-amount))        ;; Steward guard: allowlist
    (try! (validate-reserve-floor                                 ;; Steward guard: reserve floor
            (get locked-balance (contract-call? .flowvault-v2 get-vault-state tx-sender))
            lock-amount))
    (try! (contract-call? .flowvault-v2 set-routing-rules lock-amount lock-until-block split-address split-amount))
    (contract-call? .flowvault-v2 deposit token amount)))
```

Two design points worth calling out:

- **`tx-sender` is preserved** (no `as-contract`), so FlowVault attributes the vault to the real caller
  and enforces its own base invariants (future-lock, split ≤ deposit, lock ≤ hold, no self-split,
  locked-funds-on-withdraw). Steward adds guards *on top of*, never *around*, FlowVault's guarantees.
- **The reserve-floor guard reads the real on-chain locked balance** from `get-vault-state` rather than
  trusting a caller-supplied number — so the agent can't lie its way past the floor.

## 2. It uses all three FlowVault primitives

Every cycle produces a routing policy expressed entirely in FlowVault's primitives:

| Primitive | In Steward |
|---|---|
| **Lock** | The runway reserve — locked until a future block, un-withdrawable early (the money-shot). |
| **Split** | The payroll/ops payout — a fixed amount to an allowlisted recipient at deposit time. |
| **Hold** | Whatever remains stays liquid for operations. |

The live smoke test deposited 1.0 USDCx and got back exactly
`(ok deposited 1.0 · split 0.3 · locked 0.4 · held 0.3)` — Split, Lock, and Hold in one transaction.

## 3. It uses the FlowVault SDK

`@steward/sdk` wraps the published [`flowvault-sdk`](https://www.npmjs.com/package/flowvault-sdk)
(`v0.1.2`), exposing FlowVault's reads and writes in Steward's own `bigint`-typed shapes:

- Reads: `getVaultState`, `getCurrentBlock` (via `flowvault-sdk`'s typed calls).
- Writes: `routeAndDeposit` + the `steward-router` admin surface, built with `@stacks/transactions`.
- Guards: a same-network assertion (rejects mixed testnet/mainnet principals), and a `number → bigint`
  conversion boundary so no lossy `number` amount ever flows deeper (FlowVault returns balances as
  `number`; Steward refuses to propagate them).

Ground-truth reference for the SDK + contract interface: [`flowvault-notes.md`](./flowvault-notes.md).

## 4. Confirmed on testnet

The full flow ran against the deployed contracts — mint → `route-and-deposit` → money-shot withdraw →
unlocked withdraw, 6 confirmed transactions. Transaction IDs and explorer links: [`deployment.md`](./deployment.md).

## Note on the deployed instance

`steward-router` composes over *our* deployed instance of `flowvault-v2` (byte-identical to the
on-chain original, pulled from testnet), because Clarinet's requirements mechanism only resolves
*mainnet* contracts and couldn't validate a testnet-only principal pre-deploy. The integration —
Clarity composition, primitive usage, and SDK — is identical to targeting the org's instance; the
switch is a one-line principal change. See `deployment.md` → *Future enhancement*.
