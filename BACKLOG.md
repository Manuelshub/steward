# Steward — Implementation Backlog

> The set of attainables that, when complete, fully realize [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> Organized as **epics → tasks**, each with acceptance criteria and its governing spec section.
> This is a backlog (what must be true), not a schedule (when). Work top-to-bottom by dependency.

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

**Progress snapshot** _(updated 2026-07-03)_

| Epic | State |
|---|---|
| E0 Foundation | ✅ done (E0.3 funded + verified) |
| E1 Policy Compiler | ✅ done — 18/18 tests green |
| E2 Contract | ✅ E2.1–E2.7 done (23/23 tests + DEPLOYED to testnet); E2.8 stretch optional |
| E3 SDK | ✅ 17/17 tests + LIVE-VERIFIED on testnet (route-and-deposit + money-shot confirmed) |
| E4 Agent | ✅ code-complete (5/5 tests incl. injection-resistance); live LLM/submit gated on key+deploy |
| E5 Web | 🔧 source complete (attack demo + live vault + audit trail + wallet); needs `npm install` + browser QA |
| E6 Submission | ⬜ not started |

_Completed: E0 (all), E1 (all), E2 (all incl. testnet deploy), E3 (code), E4 (code). Contracts are
LIVE on testnet — the gated live paths (E3.2 read, E3.3 write, E4.2 LLM) are now runnable._

---

## E0 — Foundation & ground truth
_Unblocks everything. Resolves ARCHITECTURE.md §12 open questions before code depends on guesses._

- [x] **E0.1 Pull the real FlowVault SDK.** Confirm `flowvault-sdk` package name/version, exported
      function names, and Clarity value shapes. → _Acceptance:_ package installs; function list recorded
      in `docs/flowvault-notes.md`. (§4, §12)
      _Done: verified `flowvault-sdk@0.1.2`; full interface in `docs/flowvault-notes.md`._
- [x] **E0.2 Get real contract principals.** FlowVault contract + SIP-010 (USDCx) testnet addresses.
      → _Acceptance:_ addresses in `.env`, asserted same-network. (§4, §8)
      _Done: from SDK `DEFAULT_CONTRACTS` — `STD7….flowvault-v2`, `ST1PQ….usdcx`; in `.env.example`.
      (Same-network assertion is implemented in E3.1.)_
- [x] **E0.3 Fund a testnet account.** Operator wallet with testnet STX + USDCx.
      → _Acceptance:_ balance visible via explorer; mnemonic in agent-only `.env`. (§8, §10)
      _Done: verified via Hiro API — `ST2PQ72…583Z799` holds 687.57 STX + 21.3 USDCx. Mnemonic stays
      local (gitignored `settings/Testnet.toml` + agent `.env`); never in chat/VCS._
- [x] **E0.4 Toolchain sanity.** `npm install` across workspaces; `clarinet check` runs; `tsc` builds
      `@steward/core`. → _Acceptance:_ all three succeed on a clean clone. (§8, §9)
      _Done: Node 24 + Clarinet 3.15; `npm install` OK; `clarinet check` green; `@steward/core`
      source compiles. (Full `npm test` gated on E1.3 test file — tracked there.)_

---

## E1 — Ring 2: Policy Compiler (`packages/core`)
_The deterministic guardrail. Buildable immediately — pure, no chain dependency. Highest test density._

- [x] **E1.1 Finalize core types.** Freeze `types.ts` shapes against the real SDK from E0.1.
      → _Acceptance:_ `@steward/core` builds; types match SDK Clarity value shapes. (§7)
      _Done: aligned to SDK; added `owner` + `pendingDeposit` to `SignalContext` for codes 1011/1004/1010._
- [x] **E1.2 Implement `compile()`.** Fill the clamping body per the 6-invariant checklist in
      `compiler.ts`. → _Acceptance:_ returns `RoutingRules` for legal drafts, `Rejection{reason}`
      otherwise; pure (no I/O). (§3, §7)
      _Done: all invariants implemented, each mirroring a real on-chain error code._
- [x] **E1.3 Adversarial unit tests.** One test per invariant **plus** the demo attack cases:
      out-of-allowlist recipient, early unlock, reserve-floor breach, over-max payout,
      split+lock>deposit, unparseable/negative amounts. → _Acceptance:_ `node --test` green; every
      invariant has a failing-input case. (§3, §11)
      _Done: 18/18 green via `npm test -w @steward/core` (17 unit + property)._
- [x] **E1.4 Property test.** Fuzz random drafts; assert compiler output _never_ violates
      `GuardrailConfig`. → _Acceptance:_ passes N random cases. (§3)
      _Done: 5000-case fuzz asserts every accepted output satisfies all guardrails._

---

## E2 — Ring 1: `steward-router` contract (`packages/contracts`)
_On-chain enforcement — the ultimate authority. The demo's safety guarantee lives here._

- [x] **E2.1 Clarinet project init.** `Clarinet.toml`, deployment plans, settings; wire
      `steward-router.clar`. → _Acceptance:_ `clarinet check` passes. (§5)
      _Done: generated via `clarinet new` + `clarinet contract new steward-router`; registered in
      `Clarinet.toml` (Clarity v4) with `tests/steward-router.test.ts`; `clarinet check` green._
- [x] **E2.2 Ownership + admin.** `transfer-ownership`, `add/remove-recipient`, `set-reserve-floor`,
      all owner-gated; reads `get-owner`/`is-owner`/`is-allowlisted`/`get-reserve-floor`.
      → _Acceptance:_ non-owner calls fail with `ERR-NOT-OWNER`. (§3, §5)
      _Done: 10/10 vitest tests green, incl. all 4 non-owner ERR-NOT-OWNER gates + ownership-transfer
      lockout; `clarinet check` clean (only unused-constant warnings reserved for E2.3–E2.5)._
- [x] **E2.3 Allowlist enforcement.** Routing to a non-allowlisted recipient aborts.
      → _Acceptance:_ test proves `ERR-NOT-ALLOWLISTED`. (§5)
      _Done: `validate-recipient` guard (allowlist + recipient-required/code-1007); 14/14 tests green._
- [x] **E2.4 Reserve floor enforcement.** A rule/deposit dropping locked below floor aborts.
      → _Acceptance:_ test proves `ERR-BELOW-RESERVE-FLOOR`. (§5)
      _Done: `validate-reserve-floor` guard (projected locked = current + new lock, inclusive `>=`);
      19/19 tests green incl. exact-boundary case._
- [x] **E2.5 Route-and-deposit over FlowVault.** Compose split→lock→hold with the base contract;
      enforce `split+lock<=deposit`. → _Acceptance:_ deposit produces correct locked/unlocked split. (§4, §5)
      _Done: `route-and-deposit` runs both guards then forwards to flowvault-v2 (tx-sender preserved),
      reading real on-chain locked balance for the floor. Integration-tested against the REAL flowvault-v2
      (vendored from testnet) + a mock USDCx; 22/22 green. NOTE (E2.7): on testnet, steward-router's
      `.flowvault-v2` reference must target the real principal `STD7….flowvault-v2`._
- [x] **E2.6 Adversarial withdrawal test (the money-shot).** Withdraw of locked reserve before
      `lockUntilBlock` aborts. → _Acceptance:_ Clarinet test proves the abort. (§3, §11)
      _Done: early full withdraw -> ERR-FUNDS-LOCKED (1003); unlocked portion withdrawable; after
      `mineEmptyBlocks` past unlock, the reserve releases. 23/23 green._
- [x] **E2.7 Deploy to testnet.** → _Acceptance:_ contract live; principal in `.env`; one real tx
      confirmed on explorer (satisfies bounty requirement). (§8)
      _Done: 4 contracts deployed + confirmed under `ST2PQ72…583Z799` (self-contained: our
      flowvault-v2 instance). Interface + get-owner verified on-chain. Addresses in `.env.example` +
      `docs/deployment.md`. Satisfies the "successful testnet transaction" bounty requirement._
- [ ] **E2.8 _Stretch:_ multi-recipient payout table.** Percentage splits across allowlisted
      recipients. → _Acceptance:_ table sums to 100%; per-recipient amounts correct. (§5)

---

## E3 — SDK wrapper (`packages/sdk`)
_Typed bridge between the chain and Steward's own types._

- [x] **E3.1 Client + same-network assertion.** Construct from config; reject mixed
      testnet/mainnet principals at startup. → _Acceptance:_ throws on mismatch. (§8, §10)
      _Done: `assertSameNetwork` (ST/SN vs SP/SM) + `StewardVault` ctor; throws on mixed pair. Tested._
- [~] **E3.2 Read path.** `getVaultState()` → `VaultState` (bigint amounts). → _Acceptance:_ returns
      live testnet state. (§4, §7)
      _Coded: `getVaultState` delegates to flowvault-sdk then `toCoreVaultState`. Conversion unit-tested;
      LIVE testnet read pending deploy/E0.3._
- [x] **E3.3 Write path.** `setRoutingRules`, `deposit`, `withdraw`, `clearRoutingRules` +
      `steward-router` calls; write-then-refresh; return txids. → _Acceptance:_ each executes a
      confirmed testnet tx. (§4, §6, §10)
      _Done + LIVE-VERIFIED: `scripts/smoke.mjs` broadcast add-recipient, set-reserve-floor,
      route-and-deposit, and withdraw against the deployed contracts — all confirmed on testnet,
      including the money-shot abort `(err u1003)`. Evidence in docs/deployment.md._
- [x] **E3.4 Value conversion tests.** Clarity ↔ `@steward/core` round-trips; amounts stay
      `bigint`/`string`. → _Acceptance:_ no `number` coercion anywhere. (§7, §10)
      _Done: `microToBig` rejects non-integer/unsafe/malformed; vault-state + rules conversions tested._

---

## E4 — Ring 3 → 1: Agent (`apps/agent`)
_The decision loop. Depends on E1, E3._

- [x] **E4.1 Signal adapters.** Real: on-chain state via SDK. Config/mocked: payroll calendar,
      milestone flags. Assemble `SignalContext`. → _Acceptance:_ produces a valid context from live
      chain + config. (§6, §12)
      _Done: `assembleContext` reads live vault state + config signals. (Live read gated on deploy.)_
- [x] **E4.2 LLM proposer.** Anthropic client (`STEWARD_REASONING_MODEL`); `PolicyDraft` as a
      tool-use/JSON schema; strict parse. → _Acceptance:_ returns structured `PolicyDraft`; free-form
      text never executed. (§3, §8)
      _Done: `createAnthropicProposer` — claude-opus-4-8, adaptive thinking, single `propose_policy`
      tool; parses tool input only. (Live call needs ANTHROPIC_API_KEY.)_
- [x] **E4.3 Cycle orchestration.** poll → propose → `compile()` → diff → submit → audit.
      Idempotent (no tx when rules unchanged). → _Acceptance:_ a healthy cycle sets rules; an
      unchanged cycle is a no-op. (§6)
      _Done: `runCycle` over injected ports; healthy-cycle + idempotent-diff tests green._
- [x] **E4.4 Audit trail.** Append-only `AuditEntry` per cycle. → _Acceptance:_ trail records
      context→draft→outcome→txid, consumable by web. (§6, §7)
      _Done: `fileAuditSink` (bigint-safe JSONL) + `consoleAuditSink`._
- [x] **E4.5 Key custody.** Operator key loaded server-side only; authority limited to
      set-routing-rules/deposit. → _Acceptance:_ key never in any browser bundle; §10 items checked. (§3, §10)
      _Done: senderKey read only in `apps/agent/index.ts`; never referenced by web. Authority is
      route-and-deposit; chain forbids early withdrawal._
- [x] **E4.6 Injection-resistance test.** Adversarial prompt → compiler rejects / chain aborts;
      funds unmoved. → _Acceptance:_ end-to-end test of the attack path. (§3, §11)
      _Done: two ATTACK tests (out-of-allowlist drain, early-unlock) — compiler rejects, `submit`
      never fires. 5/5 agent tests green._

---

## E5 — Interface (`apps/web`)
_Makes the trust model visible — the judging asset. Depends on E2, E3, E4 outputs._

- [~] **E5.1 Next.js bootstrap + wallet connect.** Leather/Xverse/Hiro via Stacks Connect;
      `NEXT_PUBLIC_*` config only. → _Acceptance:_ wallet connects on testnet. (§8, §10)
      _Source written (App Router, `WalletButton` via @stacks/connect v8). Needs `npm install` +
      browser QA — sandbox couldn't build Next.js._
- [~] **E5.2 Live vault state panel.** Locked/unlocked + active rules, polled (write-then-refresh).
      → _Acceptance:_ reflects on-chain state within one poll. (§4, §6)
      _Source written (`VaultPanel` polls deployed flowvault-v2 via fetchCallReadOnlyFunction)._
- [~] **E5.3 Agent proposal feed.** Stream the audit trail: signal→proposal→compiled rules→txid.
      → _Acceptance:_ each cycle appears with its txid link. (§6)
      _Source written (`ProposalFeed` renders the real on-chain smoke-test trail with explorer links)._
- [~] **E5.4 The attack demo control.** Button injects the adversarial instruction; UI shows the
      rejection / on-chain abort and funds sitting safe. → _Acceptance:_ reproduces the money-shot
      live. (§11)
      _Source written (`AttackDemo` runs the REAL @steward/core compiler in-browser; links to the
      on-chain money-shot). The centerpiece._
- [~] **E5.5 User-signed deposit/withdraw.** No operator key in browser. → _Acceptance:_ deposits via
      connected wallet; locked withdraw blocked pre-unlock. (§10)
      _Wired: `DepositCard` — wallet-signed mint + route-and-deposit via @stacks/connect v8 `request`.
      Pending browser QA (connect v8 call shape unverifiable in sandbox)._

---

## E6 — Submission package
_Turns a working system into a winning entry. Maps to the bounty's required deliverables._

- [ ] **E6.1 Public GitHub repo** — clean history, MIT, ARCHITECTURE.md front-and-center. (bounty req)
- [ ] **E6.2 Working demo app deployed** — reachable URL on testnet. (bounty req)
- [ ] **E6.3 Demo video** — follows the §11 narrative; ends on the attack money-shot. (bounty req)
- [ ] **E6.4 Integration write-up** — how Steward uses Lock/Split/Hold + the extension. (bounty req)
- [ ] **E6.5 Testnet tx evidence** — explorer links to set-rules, deposit, and the aborted attack. (bounty req)
- [ ] **E6.6 Builder Award artifact** — `steward-router` extension (+ any SDK/doc contributions)
      written up as an upstream improvement. (§5, Ecosystem)

---

## Dependency map

```
E0 ──┬─▶ E1 ─────────────┐
     ├─▶ E2 ──▶ E3 ──▶ E4 ├─▶ E5 ──▶ E6
     └─────────▲──────────┘
```

E0 first. E1 (compiler) and E2 (contract) can proceed in parallel. E3 needs E2 deployed. E4 needs
E1 + E3. E5 needs E2/E3/E4. E6 packages the result.

## Critical path to a demoable MVP

`E0.1–E0.3 → E2.1–E2.7 → E3.1–E3.3 → E1.2/E1.3 → E4.1–E4.4 → E5.1–E5.4`

The **stretch** (E2.8) and hardening (E1.4, E4.6 as a formal test) are cut first if time is short —
but E2.6 (the on-chain abort) and E5.4 (the attack demo) are **not** optional: they are the entry.
