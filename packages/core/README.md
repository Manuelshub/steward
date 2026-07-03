# @steward/core — Ring 2

Shared types and the **Policy Compiler**, the deterministic guardrail that clamps the LLM's untrusted
proposal into legal FlowVault routing rules.

- `src/types.ts` — the contracts between layers (`SignalContext`, `PolicyDraft`, `RoutingRules`,
  `Rejection`, `VaultState`, `GuardrailConfig`, `AuditEntry`).
- `src/compiler.ts` — `compile(draft, ctx, cfg) → RoutingRules | Rejection`. **Pure, no I/O.**

**Rule:** this package depends on nothing external and touches no network/keys, so Ring 2 stays
trivially auditable and testable. See [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) §3 and §7.

The compiler's invariant checklist (each needs a unit test, including the adversarial demo cases)
is documented inline in `src/compiler.ts`.
