# Steward

**An autonomous treasury agent that can't rug you — because the vault, not the AI, holds the rules.**

Steward is built on [FlowVault](https://flow-vault.dev) for the FlowVault Builder Bounty
(Experimental Money Behaviors / Treasury Automation). An AI agent _proposes_ how a treasury routes
its funds each cycle; FlowVault's on-chain Lock / Split / Hold primitives _enforce_ what is actually
allowed. Even a compromised or hallucinating agent cannot move money outside the on-chain guardrails.

> 📐 **Start here:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) is the defining specification for the
> whole project. Read it before writing code.

## The idea in one picture

```
SIGNALS ──▶ AGENT (proposes) ──▶ POLICY COMPILER (clamps) ──▶ FLOWVAULT (enforces on-chain)
                 Ring 3                   Ring 2                        Ring 1
              untrusted              deterministic                  immutable authority
```

Three concentric rings of defense. The AI lives in the outermost, untrusted ring. See
[§3 Trust model](./ARCHITECTURE.md#3-the-trust-model-the-heart-of-the-project).

## Workspace layout

| Path | Layer | Responsibility |
|---|---|---|
| `packages/core` | Ring 2 | Shared types + the deterministic Policy Compiler (pure, no I/O). |
| `packages/contracts` | Ring 1 | `steward-router.clar` extension + on-chain invariant tests (Clarinet). |
| `packages/sdk` | — | Thin typed wrapper over `flowvault-sdk`. |
| `apps/agent` | Ring 3→2→1 | Decision loop: signal adapters, LLM proposer, tx submitter. |
| `apps/web` | — | Next.js demo: wallet, live vault state, proposal feed, attack demo. |

## Prerequisites

- Node.js 18+ (repo developed on Node 24)
- Clarinet 3.13+ (repo developed on Clarinet 3.15)
- A Stacks wallet (Leather / Xverse / Hiro)
- Testnet STX + USDCx balance
- An Anthropic API key (for the agent)

## Getting started

```bash
cp .env.example .env      # fill in contract principals + keys
npm install               # installs all workspaces
```

Package-specific instructions live in each package's `README.md`. Build steps are intentionally not
scripted here yet — the architecture comes first.

## Status

Scaffold + architecture complete. Implementation in progress.
