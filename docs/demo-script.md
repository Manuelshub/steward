# Demo video script (~2.5 min)

Goal: land the thesis — *AI proposes, compiler clamps, chain enforces* — and end on the on-chain
money-shot. Screens: the web app (`npm run dev -w @steward/web`) + the Hiro testnet explorer.

---

**0:00 — The hook (web app, hero)**
> "This is Steward — an autonomous treasury agent. An AI decides how the money moves. Normally that's
> terrifying. Here it can't rug you, and I'll show you exactly why."

Show the hero + stat bar (63 tests, 4 contracts, 6 routing txns, 3 rings).

**0:20 — The pipeline (attack demo, healthy)**
> "Every cycle: signals come in, the AI proposes a policy, a compiler checks it, and only then does it
> hit the chain. Here's a healthy proposal — pay payroll, lock a reserve. The compiler passes it,"

Click **Healthy cycle**. Point at the green pipeline (Ring 2 + Ring 1 lit).

> "…and this exact routing actually ran on testnet."

Click the "ran on testnet ↗" link → show the `route-and-deposit` tx result:
`(ok deposited 1.0 · split 0.3 · locked 0.4 · held 0.3)`.

**0:55 — The attack (attack demo)**
> "Now the scary part. Say the AI is hijacked — prompt-injected to drain the treasury to an attacker."

Click **💀 Drain to attacker**. The pipeline snaps: Ring 2 turns red, "BLOCKED", Ring 1 dims.
> "The compiler rejects it — the recipient isn't allowlisted — and no transaction is ever built. The
> AI never gets to the chain."

Click **💀 Unlock reserve now** → rejected again (below minimum lock).

**1:30 — The money-shot (explorer)**
> "But what if something slips past the software? The vault is the last line. Watch — here's a real
> testnet transaction trying to withdraw the locked reserve early."

Open the money-shot tx in the explorer → **`abort_by_response · (err u1003)`**.
> "Aborted, on-chain. The funds are locked until their unlock block. Not the agent, not even the
> owner, can pull them early. The vault holds the authority — not the AI."

**1:55 — It's real & self-serve (web app)**
> "It's all live. Real vault balances, the real transaction trail, and you can try it yourself —"

Scroll to **Live state / audit trail**, then **Try it yourself**: connect wallet → mint → deposit →
show the txid link.

**2:15 — Close**
> "Steward: an AI treasury agent on a leash the chain enforces. Built on FlowVault, on Stacks. Sixty-
> three tests, four contracts live on testnet, and a money-shot you can verify on-chain right now."

Show the guarantees checklist + deployed-contracts section. End on the hero.

---

## Shot list / assets
- Web app running locally (or deployed URL).
- Explorer tabs pre-opened: money-shot tx, the `route-and-deposit` tx (see `deployment.md`).
- A testnet wallet (Leather/Xverse) for the "try it yourself" segment.
