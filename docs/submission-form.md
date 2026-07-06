# Submission answer sheet — copy/paste into the Notion form

Form: https://earthy-mandrill-c8b.notion.site (from https://flow-vault.dev/bounty)
Deadline: **July 9, 23:59 UTC**. Today: 2026-07-06.

Fill the Notion form field-by-field from the blocks below. Fields marked **⬜ ACTION**
need an artifact only you can produce (push repo / deploy / record). Everything else is ready.

---

## Project name
Steward

## Tagline / one-line description
An autonomous treasury agent that can't rug you — the vault holds the rules, not the AI.

## Track
Experimental Money Behaviors (also satisfies Treasury Automation)

## Builder / contact
- Name: Emmanuel
- Email: kcemmy03@gmail.com
- Stacks (testnet) address: ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799

## Short description (~2–3 sentences)
Steward is a constrained-autonomy AI treasury agent. An LLM *proposes* how to route treasury
funds; a deterministic compiler *clamps* the proposal to hard guardrails; and FlowVault's on-chain
Lock / Split / Hold primitives *enforce* the result. Three concentric rings of defense — untrusted
AI, deterministic compiler, immutable Clarity vault — mean that even a fully prompt-injected agent
can't move money outside the owner's rules. The vault holds the authority, not the AI.

## Full description
Autonomous treasury agents are powerful but terrifying: if the AI is wrong, jailbroken, or
prompt-injected, it can drain the treasury. Steward inverts that trust. The AI never has authority —
it only makes a *suggestion*. That suggestion passes through two layers that it cannot influence:

- **Ring 2 — the Policy Compiler** (`@steward/core`): a pure, deterministic, dependency-free module
  that rewrites any proposal to satisfy an allowlist, a reserve floor, a max-payout cap, and
  FlowVault's own invariants — or rejects it outright. No network, no state, fully testable
  (18 tests incl. a 5000-case property fuzz).
- **Ring 1 — the Clarity vault**: `steward-router.clar` composes over the real `flowvault-v2`
  contract, adding an on-chain recipient allowlist and reserve floor, then routing through
  FlowVault's Lock / Split / Hold. `tx-sender` is preserved (no `as-contract`), so every one of
  FlowVault's base invariants still applies. This is the last line — even if software above it is
  compromised, the chain refuses illegal moves.

The demo shows a healthy cycle routing real funds on testnet, then a prompt-injected "drain to
attacker" attempt being rejected by the compiler before any transaction is built, and finally an
on-chain money-shot: a real testnet transaction trying to withdraw the locked reserve early, aborting
with `(err u1003)`. Not the agent, not even the owner, can pull locked funds early.

## GitHub repository (public)
⬜ ACTION — push and paste the URL. Suggested:
`git remote add origin https://github.com/<you>/steward.git && git push -u origin main`
(Push `main`, or open a PR from `feature/compiler-and-contracts` and merge it first.)

## Live demo URL
⬜ ACTION — deploy `apps/web` (Vercel: root `apps/web`, framework Next.js) and paste the URL.
No env vars required — the app ships with the deployed testnet contract addresses baked in
(overridable via `NEXT_PUBLIC_*`). Optional `ANTHROPIC_API_KEY` only if you wire live LLM proposals.

## Demo video URL
⬜ ACTION — record ~2.5 min using `docs/demo-script.md`, upload (YouTube/Loom unlisted), paste the URL.

## FlowVault integration explanation
Steward integrates with FlowVault at all three levels:

1. **Clarity** — `steward-router.clar` is an extension that composes over the real `flowvault-v2`
   contract. Its single entry point `route-and-deposit` runs Steward's guards (allowlist + reserve
   floor, the reserve floor read from the *real* on-chain `get-vault-state` locked balance) and then
   calls `flowvault-v2 set-routing-rules` + `deposit`. `tx-sender` is preserved, so FlowVault's base
   invariants (future-lock, split ≤ deposit, lock ≤ hold, no self-split, locked-withdraw block) all
   still hold. Steward adds guards *on top of*, never *around*, FlowVault.
2. **SDK** — `@steward/sdk` wraps the published `flowvault-sdk@0.1.2`, exposing FlowVault's reads and
   writes in bigint-typed shapes with a same-network assertion and a lossy-`number` → `bigint`
   conversion boundary.
3. **Primitives** — every cycle uses all three: **Lock** (the runway reserve, un-withdrawable early),
   **Split** (the payroll payout to an allowlisted recipient), **Hold** (the remainder stays liquid).

Full write-up: `docs/integration.md`. Ground-truth SDK/contract reference: `docs/flowvault-notes.md`.

## Successful testnet transaction(s)
All confirmed on Stacks testnet (explorer: https://explorer.hiro.so, chain=testnet):

- **Real routing (Split + Lock + Hold in one tx)** — `(ok deposited 1.0 · split 0.3 · locked 0.4 · held 0.3)`
  txid: `0x68d75b9e3cf5d1b8577bff37793282f4dfc397175ff95a7a41f4e0372fe42c76`
- **Money-shot (early-unlock attempt aborts on-chain)** — `abort_by_response · (err u1003)`
  txid: `0x38032c3b8b781bfeaa2fb9bb77a45ee6f2f8ee814370054158eca9a6c8a8c64e`
- **Unlocked withdraw** — txid: `0xfaa170c043107d2b4854dd24a248d653ee69a68cc49938b9023ff8aa5fa30ab1`
- Plus 4 contract deploys + additional routing txns. Full trail: `docs/deployment.md`.

Deployed contracts (testnet, deployer `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799`):
`flowvault-v2`, `steward-router`, `mock-usdcx`, `sip-010-trait`.

## FlowVault SDK or contracts used?
Both. `steward-router.clar` composes the `flowvault-v2` Clarity contract; `@steward/sdk` wraps the
published `flowvault-sdk` npm package.

## Which primitive(s)?
All three — Lock, Split, and Hold — composed in a single `route-and-deposit` transaction.

## Anything else / notes to judges
- 63 automated tests across compiler, SDK, agent, and Clarity contracts — including the adversarial
  prompt-injection path and the on-chain early-unlock abort.
- Builder Award candidate: `steward-router` is a reusable, on-chain "bounded agentic treasury"
  pattern (allowlist + reserve floor) that any automated depositor can adopt. See `docs/builder-award.md`.
- Note on deployment: `steward-router` composes over *our* byte-identical deployed instance of
  `flowvault-v2` (Clarinet's requirements mechanism only resolves mainnet principals). Switching to
  the org's instance is a one-line principal change. Details in `docs/deployment.md`.
