# Builder Award — the `steward-router` extension

> For the bounty's Builder Awards (SDK improvements, contracts, documentation, feedback).

Steward contributes a reusable, on-chain **safety extension over FlowVault**:
[`steward-router.clar`](../packages/contracts/contracts/steward-router.clar).

## What it adds

FlowVault's base contract enforces a strong set of invariants (future-lock, split ≤ deposit, lock ≤
hold, no self-split, locked-funds withdrawal blocking). `steward-router` adds the two guarantees the
base contract does **not** provide — precisely the ones an *autonomous* depositor needs:

1. **Recipient allowlist** — the owner registers permitted payout recipients; a split to any other
   principal aborts with `ERR-NOT-ALLOWLISTED`. This removes "the agent invented a new payee" as a
   threat entirely.
2. **Reserve floor** — an owner-set minimum that must remain locked; any routing that would breach it
   aborts with `ERR-BELOW-RESERVE-FLOOR`. The runway is protected on-chain, not by policy.

Both are **owner-controlled and enforced on-chain** — never conveniences that weaken FlowVault's
guarantees. Ownership itself is transferable and every admin write is `tx-sender`-gated.

## Why it's a reusable pattern

This is a general **"bounded agentic treasury"** primitive: any automated or AI-driven depositor can
be given the `route-and-deposit` path and *nothing else*, and the allowlist + reserve floor bound what
it can do — regardless of bugs or prompt injection upstream. The contract is the guardrail; the agent
is on a leash.

## Verification

- `clarinet check` — clean.
- **23 Clarinet tests** covering ownership gating, allowlist enforcement, reserve-floor enforcement,
  `route-and-deposit` composition over the real `flowvault-v2`, and the adversarial withdrawal path.
- **Live on testnet** — allowlist and reserve-floor guards exercised end-to-end (see `deployment.md`).

## Supporting contributions

- **`@steward/core`** — a standalone, dependency-free **Policy Compiler** that mirrors FlowVault's
  invariants off-chain (18 tests incl. a 5000-case property fuzz). Useful to anyone building on
  FlowVault who wants to validate routing before broadcasting.
- **`docs/flowvault-notes.md`** — a verified ground-truth reference for `flowvault-sdk@0.1.2` and the
  testnet contract interface (methods, shapes, and the full error-code table), assembled by inspecting
  the published package and on-chain source.
