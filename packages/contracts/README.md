# @steward/contracts — Ring 1

The on-chain enforcement layer: a Clarinet project holding the **`steward-router`** extension over
FlowVault, plus the invariant tests that prove funds are safe regardless of what the agent does.

## What lives here

- `contracts/steward-router.clar` — the extension (ARCHITECTURE.md §5):
  - **recipient allowlist** — the agent can route only to owner-registered principals;
  - **reserve floor** — a minimum that must remain locked;
  - **multi-recipient payout table** (stretch).
- `tests/` — Clarinet tests for every Ring 1 invariant, **including the adversarial withdrawal path**
  (the demo attack): an attempt to withdraw the locked reserve before its unlock height must abort.

## Commands

```bash
clarinet check        # from this directory — must pass
npm test              # runs the invariant suite — must pass
```

## Invariants (from ARCHITECTURE.md §3 / §5)

1. Locked balance is not withdrawable before `lockUntilBlock`.
2. All mutations are principal-gated (owner only).
3. `split + lock > deposit` ⇒ transaction aborts (no partial state).
4. Split recipients must be on the allowlist.
5. Reserve floor: a rule/deposit that would drop locked below the floor aborts.

> `Clarinet.toml`, deployment plans, and settings are generated with `clarinet new`/`clarinet
> deployments` during the build phase, then the `steward-router` contract + tests are added here.
