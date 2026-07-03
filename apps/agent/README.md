# apps/agent — the decision loop (Ring 3 → 2 → 1)

The off-chain agent. Runs a cycle (default every `AGENT_CYCLE_INTERVAL_MS`):

1. **Poll** signal adapters → `SignalContext` (ARCHITECTURE.md §6).
2. **Propose** — call the LLM (`STEWARD_REASONING_MODEL`) with the context + guardrail constraints;
   receive a `PolicyDraft` as **structured output** (tool-use). Free-form text is never executed.
3. **Compile** — run `@steward/core`'s `compile()` (Ring 2) → `RoutingRules | Rejection`.
4. **Diff** — skip if unchanged (idempotent, no wasted tx).
5. **Submit** — sign `set-routing-rules` via `@steward/sdk` with the operator key; record the txid.
6. **Audit** — append the full `AuditEntry` to the trail consumed by `apps/web`.

## Key custody (non-negotiable)

The operator key lives **only** here, in the server runtime — never in `apps/web`. Its on-chain
authority is limited to `set-routing-rules` and `deposit`; it cannot withdraw locked funds early
because Ring 1 forbids it. See ARCHITECTURE.md §3 and the §10 checklist.

## Planned layout

```
src/
  signals/     adapters: on-chain (real) + payroll/milestone (config/mocked)
  llm/         Anthropic client + PolicyDraft tool schema + prompt
  cycle.ts     orchestrates poll → propose → compile → diff → submit → audit
  audit.ts     append-only audit trail writer
  index.ts     entrypoint + interval loop
```
