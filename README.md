# Steward

**An autonomous treasury agent that can't rug you — because the vault holds the rules, not the AI.**

Steward is a programmable treasury built on [FlowVault](https://flow-vault.dev) for the FlowVault
Builder Bounty (Experimental Money Behaviors / Treasury Automation). An AI agent *proposes* how a
treasury routes its funds each cycle; a deterministic compiler *clamps* every proposal; and
FlowVault's on-chain Lock / Split / Hold primitives *enforce* what's actually allowed. **Even a fully
compromised or hallucinating agent cannot move money outside the on-chain guardrails.**

This is a deliberate **inversion of trust**. Most "AI treasury" projects put the model in control and
hope it behaves. Steward puts it on a leash whose length is fixed by immutable Clarity code.

> 🎬 **The money-shot, live on testnet:** an attempt to drain the locked reserve →
> [`(err u1003)` — funds locked](https://explorer.hiro.so/txid/0x38032c3b8b781bfeaa2fb9bb77a45ee6f2f8ee814370054158eca9a6c8a8c64e?chain=testnet).
> The AI never had the authority. The vault did.

---

## The three rings of defense

```
  Ring 3 — the LLM proposal            UNTRUSTED   (can hallucinate / be prompt-injected)
    └─ Ring 2 — the Policy Compiler     deterministic, pure, no I/O — clamps to legal rules
        └─ Ring 1 — the vault           immutable Clarity — the ultimate authority over funds
```

No single-layer failure loses funds: Ring 3 lies → Ring 2 clamps it → and even if Ring 2 had a bug,
Ring 1 still gates every withdrawal by lock height and ownership. Defense in depth *is* the product.

Full design: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## One cycle

```
poll signals → LLM proposes (Ring 3) → compile/clamp (Ring 2) → diff → submit on-chain (Ring 1) → audit
```

The agent's "intelligence" lives entirely in Ring 3. Everything inside it is deterministic or immutable.

---

## What it uses from FlowVault

Steward composes all three FlowVault primitives, gated by its own on-chain guardrails:

- **Lock** — a reserve is locked until a future block; un-withdrawable early, even by the owner.
- **Split** — a fixed amount is routed to an allowlisted recipient at deposit time.
- **Hold** — the remainder stays liquid in the vault.

Its extension, **`steward-router`**, adds the two guarantees the base contract doesn't have — a
**recipient allowlist** and a **reserve floor** — enforced on-chain (see [`docs/builder-award.md`](./docs/builder-award.md)).
Full integration write-up: [`docs/integration.md`](./docs/integration.md).

---

## Deployed on Stacks testnet

Deployer `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799` — see [`docs/deployment.md`](./docs/deployment.md).

| Contract | Principal |
|---|---|
| `steward-router` (our extension) | `ST2PQ72…583Z799.steward-router` |
| `flowvault-v2` | `ST2PQ72…583Z799.flowvault-v2` |
| `mock-usdcx` | `ST2PQ72…583Z799.mock-usdcx` |
| `sip-010-trait` | `ST2PQ72…583Z799.sip-010-trait` |

A live smoke test ran the whole flow end-to-end (mint → route-and-deposit → money-shot abort →
unlocked withdraw) — 6 confirmed transactions, links in `docs/deployment.md`.

---

## Monorepo

| Package | Ring | What it is |
|---|---|---|
| `packages/core` (`@steward/core`) | Ring 2 | The Policy Compiler + shared types. Pure, no I/O. **18 tests.** |
| `packages/contracts` (`steward-router.clar`) | Ring 1 | On-chain allowlist + reserve floor over FlowVault. **23 tests.** |
| `packages/sdk` (`@steward/sdk`) | — | Typed wrapper over `flowvault-sdk` — same-network guard, bigint boundary. **17 tests.** |
| `apps/agent` (`@steward/agent`) | Ring 3→1 | The decision loop: LLM proposer, cycle, audit. **5 tests.** |
| `apps/web` (`@steward/web`) | — | The demo UI — the trust model, made visible. |

**63 automated tests across the stack, all passing.**

## Getting started

```bash
cp .env.example .env        # deployed testnet addresses are the defaults
npm install

# Contracts (Ring 1)
npm run contracts:check     # clarinet check
npm run contracts:test      # 23 Clarinet tests

# Compiler / SDK / agent
npm test -w @steward/core   # 18 tests
npm test -w @steward/sdk    # 17 tests
npm test -w @steward/agent  # 5 tests (incl. injection-resistance)

# Web demo
npm run dev -w @steward/web  # http://localhost:3000

# Live testnet smoke test (needs a funded mnemonic in packages/contracts/settings/Testnet.toml)
node packages/contracts/scripts/smoke.mjs
```

The agent (`apps/agent`) needs an `ANTHROPIC_API_KEY` and an operator key to run live; see `.env.example`.

---

## Bounty deliverables

See [`SUBMISSION.md`](./SUBMISSION.md) for the deliverable checklist mapped to the bounty requirements,
and [`docs/demo-script.md`](./docs/demo-script.md) for the demo-video walkthrough.

## License

MIT — see [`LICENSE`](./LICENSE).
