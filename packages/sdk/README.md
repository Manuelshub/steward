# @steward/sdk

A thin, typed wrapper over [`flowvault-sdk`](https://flow-vault.dev) that exposes exactly the flows
Steward needs, in Steward's own types (`@steward/core`).

## Responsibility

- Wrap FlowVault calls: `setRoutingRules`, `deposit`, `withdraw`, `clearRoutingRules`, `getVaultState`.
- Wrap the `steward-router` extension calls (allowlist, reserve floor, route-and-deposit).
- Convert between FlowVault Clarity values and `@steward/core` types (`RoutingRules`, `VaultState`) —
  amounts as `bigint`/`string`, never `number`.
- Assert **same-network** contract + token principals at construction (ARCHITECTURE.md §8).

## Not its job

- No policy logic (that's `@steward/core`).
- No key custody decisions (that's `apps/agent`).

> The exact `flowvault-sdk` function names are confirmed against the published package during the
> build phase (docs describe behavior; §12 open question).
