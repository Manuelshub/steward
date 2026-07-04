# @steward/web — demo UI

Next.js (App Router) dashboard that makes Steward's trust model visible.

## Panels

- **Constrained autonomy — live compiler** (`AttackDemo`): runs the *real* `@steward/core`
  compiler (Ring 2) **in your browser** on healthy vs. adversarial LLM proposals. The attack
  scenarios (drain-to-attacker, unlock-reserve) are rejected on-device — the AI never gets to submit.
  The healthy case links to the actual routing tx on testnet.
- **Live vault state** (`VaultPanel`): polls the deployed `flowvault-v2` for the treasury's
  locked/unlocked balances (read-only; no wallet needed).
- **On-chain audit trail** (`ProposalFeed`): the real confirmed testnet transactions from the live
  smoke test — including the money-shot `(err u1003)` abort.
- **Wallet connect** (`WalletButton`): Leather/Xverse via `@stacks/connect` (read-only; the operator
  key never touches the browser — see ARCHITECTURE.md §3, §10).

## Run

```bash
# from repo root (installs the workspace) OR from apps/web
npm install
npm run dev            # http://localhost:3000
```

Config comes from `NEXT_PUBLIC_*` env vars (see repo `.env.example`); the deployed testnet
addresses are baked in as defaults in `lib/config.ts`, so it runs with zero setup.

## Note

This app was authored but **not built in the development sandbox** (its network can't install the
Next.js tree, and it can't render a browser). Run `npm run dev` and do a visual pass; the
compiler-driven panels use our already-tested `@steward/core`, and the reads hit the public Hiro API.
If `npm run build` surfaces a type nit, it'll be in the wallet/connect glue — the read-only + compiler
paths are the load-bearing demo.
