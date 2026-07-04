# Steward — FlowVault Builder Bounty submission

**Track:** Experimental Money Behaviors (also satisfies Treasury Automation).
**One line:** An autonomous treasury agent that can't rug you — the vault holds the rules, not the AI.

## Bounty requirements

| Requirement | Status | Where |
|---|---|---|
| Public GitHub repository | ⬜ push this repo | (add remote + push) |
| Working demo application | ✅ built · ⬜ deploy URL | `apps/web` — `npm run dev -w @steward/web` |
| Demo video | ⬜ record | script: [`docs/demo-script.md`](./docs/demo-script.md) |
| FlowVault integration explanation | ✅ | [`docs/integration.md`](./docs/integration.md) |
| ≥ 1 successful testnet transaction | ✅ | 4 deploys + 6 routing txns — [`docs/deployment.md`](./docs/deployment.md) |
| Uses FlowVault SDK or Clarity contracts | ✅ both | `steward-router.clar` composes `flowvault-v2`; `@steward/sdk` wraps `flowvault-sdk` |
| ≥ 1 primitive (Lock / Split / Hold) | ✅ all three | one `route-and-deposit` = split + lock + hold |

## Judging criteria — how Steward scores

| Criterion | Weight | Steward |
|---|---|---|
| Innovation & Design | 35% | Trust inversion — "AI proposes, chain constrains." A safety story, demonstrable in 15s. |
| FlowVault integration depth | 30% | Clarity extension over `flowvault-v2` + SDK wrapper + all three primitives, live on testnet. |
| Technical execution | 20% | 63 automated tests; deterministic compiler; on-chain invariant tests incl. the adversarial path. |
| Ecosystem value | 15% | Reusable "bounded agentic treasury" pattern + upstream `steward-router` (Builder Award). |

## The proof (verify these)

- **Money-shot** — draining the locked reserve aborts on-chain:
  [`(err u1003)`](https://explorer.hiro.so/txid/0x38032c3b8b781bfeaa2fb9bb77a45ee6f2f8ee814370054158eca9a6c8a8c64e?chain=testnet)
- **Real routing** — split + lock + hold in one tx:
  [`(ok deposited 1.0 · split 0.3 · locked 0.4 · held 0.3)`](https://explorer.hiro.so/txid/0x68d75b9e3cf5d1b8577bff37793282f4dfc397175ff95a7a41f4e0372fe42c76?chain=testnet)
- **Tests** — `npm test -w @steward/core && npm test -w @steward/sdk && npm test -w @steward/agent && npm run contracts:test` → 63 passing.

## Deliverable documents

- Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- FlowVault integration: [`docs/integration.md`](./docs/integration.md)
- Builder Award (the `steward-router` extension): [`docs/builder-award.md`](./docs/builder-award.md)
- Deployment + on-chain evidence: [`docs/deployment.md`](./docs/deployment.md)
- Demo video script: [`docs/demo-script.md`](./docs/demo-script.md)
- SDK/contract ground truth: [`docs/flowvault-notes.md`](./docs/flowvault-notes.md)

## What's left for you (needs accounts/hardware I can't touch)

1. **Create the GitHub repo** and push (`git remote add origin … && git push -u origin <branch>`).
2. **Deploy the web app** (e.g. Vercel: `apps/web`) and drop the URL into the table above.
3. **Record the demo video** using `docs/demo-script.md`.
4. *(Optional)* add `ANTHROPIC_API_KEY` to run the agent with live LLM proposals.
