;; steward-router — on-chain enforcement extension over FlowVault (Ring 1).
;;
;; See ARCHITECTURE.md §5. Every feature added here is an INVARIANT enforced on-chain,
;; never a convenience that weakens FlowVault's guarantees.
;;
;; This is a SPECIFICATION STUB: the surface (constants, storage, function signatures)
;; is fixed by the architecture; bodies are implemented during the build phase and must
;; pass `clarinet check` + the tests in ../tests.

;; --- Errors ---
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-NOT-ALLOWLISTED (err u101))
(define-constant ERR-BELOW-RESERVE-FLOOR (err u102))
(define-constant ERR-EXCEEDS-DEPOSIT (err u103))

;; --- Ownership ---
(define-data-var owner principal tx-sender)

;; --- Guardrail state (owner-controlled, NOT agent-controlled) ---
;; Recipients the agent is permitted to route to.
(define-map allowlist principal bool)
;; Minimum amount that must remain locked (reserve floor).
(define-data-var reserve-floor uint u0)

;; --- Admin (owner only) ---
;; (define-public (set-owner (new principal)) ...)
;; (define-public (add-recipient (who principal)) ...)      ;; gate: is-owner
;; (define-public (remove-recipient (who principal)) ...)   ;; gate: is-owner
;; (define-public (set-reserve-floor (amount uint)) ...)    ;; gate: is-owner

;; --- Routing (mirrors/wraps FlowVault set-routing-rules + deposit) ---
;; Enforces: recipient is allowlisted; resulting locked balance >= reserve-floor;
;; split + lock <= deposit (else abort). See invariant checklist in README.
;; (define-public (route-and-deposit (amount uint) (lock uint) (unlock-height uint)
;;                                   (split-to (optional principal)) (split-amt uint)) ...)

;; --- Reads ---
;; (define-read-only (is-allowlisted (who principal)) ...)
;; (define-read-only (get-reserve-floor) (ok (var-get reserve-floor)))

(define-read-only (is-owner (who principal))
  (is-eq who (var-get owner)))
