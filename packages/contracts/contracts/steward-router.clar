;; steward-router -- on-chain enforcement extension over FlowVault (Ring 1).
;;
;; See ARCHITECTURE.md section 5. Every feature added here is an INVARIANT enforced on-chain,
;; never a convenience that weakens FlowVault's guarantees.
;;
;; Build status: E2.2 admin + E2.3/E2.4 guards + E2.5 route-and-deposit IMPLEMENTED.
;; Every function must pass `clarinet check` + the tests in ../tests.

;; The SIP-010 token trait, used by route-and-deposit and forwarded to flowvault-v2.
(use-trait ft-trait .sip-010-trait.sip-010-trait)

;; --- Errors ---
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-NOT-ALLOWLISTED (err u101))
(define-constant ERR-BELOW-RESERVE-FLOOR (err u102))
;; Note: split+lock<=deposit (code 1004) and lock<=hold (1010) are enforced by
;; flowvault-v2 downstream, so steward-router does not re-declare an error for them.

;; --- Ownership ---
(define-data-var owner principal tx-sender)

;; --- Guardrail state (owner-controlled, NOT agent-controlled) ---
;; Recipients the agent is permitted to route to.
(define-map allowlist principal bool)
;; Minimum amount that must remain locked (reserve floor).
(define-data-var reserve-floor uint u0)

;; --- Admin (owner only) (E2.2) ---
;; Each write authorizes on `tx-sender` (the principal that signed the tx) INLINE, so
;; Clarinet's check_checker credits the guard in the same function it protects. asserts!
;; short-circuits the whole call with ERR-NOT-OWNER when the caller is not the owner.

;; Hand ownership to a new principal. After this, only `new-owner` can administer.
(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-NOT-OWNER)
    (var-set owner new-owner)
    (print { event: "transfer-ownership", new-owner: new-owner })
    (ok true)))

;; Add a principal to the payout allowlist. The agent may later route ONLY to
;; allowlisted principals (enforced in E2.3), so this is the owner's veto over payees.
(define-public (add-recipient (who principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-NOT-OWNER)
    (map-set allowlist who true)
    (print { event: "add-recipient", who: who })
    (ok true)))

;; Remove a principal from the allowlist.
(define-public (remove-recipient (who principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-NOT-OWNER)
    (map-delete allowlist who)
    (print { event: "remove-recipient", who: who })
    (ok true)))

;; Set the reserve floor: the minimum amount that must remain locked (enforced in E2.4).
(define-public (set-reserve-floor (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-NOT-OWNER)
    (var-set reserve-floor amount)
    (print { event: "set-reserve-floor", amount: amount })
    (ok true)))

;; --- Routing (mirrors/wraps FlowVault set-routing-rules + deposit) --- (E2.5, pending)
;; Enforces: recipient is allowlisted; resulting locked balance >= reserve-floor;
;; split + lock <= deposit (else abort). See invariant checklist in README.
;; (define-public (route-and-deposit (amount uint) (lock uint) (unlock-height uint)
;;                                   (split-to (optional principal)) (split-amt uint)) ...)

;; --- Reads ---
(define-read-only (get-owner)
  (var-get owner))

(define-read-only (is-owner (who principal))
  (is-eq who (var-get owner)))

(define-read-only (is-allowlisted (who principal))
  (default-to false (map-get? allowlist who)))

(define-read-only (get-reserve-floor)
  (var-get reserve-floor))

;; --- Routing validation (E2.3) ---
;; Reusable guard: a split may only pay an allowlisted recipient. route-and-deposit (E2.5)
;; will `(try! (validate-recipient ...))` before composing with flowvault-v2. Defined here
;; (below the reads) because Clarity only lets a function call ones defined above it.
;;   - split-amt = 0  -> ok (pure lock/hold, there is no payee to check)
;;   - split-amt > 0  -> a recipient must be present AND allowlisted, else ERR-NOT-ALLOWLISTED
;;                       (the "recipient present" arm also mirrors FlowVault code 1007)
(define-read-only (validate-recipient (split-to (optional principal)) (split-amt uint))
  (if (is-eq split-amt u0)
    (ok true)
    (match split-to
      recipient (if (is-allowlisted recipient) (ok true) ERR-NOT-ALLOWLISTED)
      ERR-NOT-ALLOWLISTED)))

;; --- Reserve-floor validation (E2.4) ---
;; Mirrors the Ring-2 compiler check: the locked balance AFTER this cycle (what is already
;; locked in flowvault-v2 + the lock we are about to apply) must stay at or above the floor.
;; route-and-deposit (E2.5) supplies `current-locked` from flowvault-v2 get-vault-state.
;; Note: `+` aborts on uint overflow, which is an acceptable (and safe) failure mode here.
(define-read-only (validate-reserve-floor (current-locked uint) (lock-amount uint))
  (if (>= (+ current-locked lock-amount) (var-get reserve-floor))
    (ok true)
    ERR-BELOW-RESERVE-FLOOR))

;; --- Routing composition over flowvault-v2 (E2.5) ---
;; The single entry the agent uses. Runs Steward's guards, then forwards to flowvault-v2
;; WITHOUT as-contract, so tx-sender is preserved: the vault is keyed to the caller and
;; flowvault-v2 backstops its own base invariants (future-lock 1008, split<=deposit 1004,
;; lock<=hold 1010, no self-split 1011, funds-locked-on-withdraw 1003).
;; The reserve-floor guard reads the REAL current locked balance on-chain (not caller input).
(define-public (route-and-deposit
    (token <ft-trait>)
    (amount uint)
    (lock-amount uint)
    (lock-until-block uint)
    (split-address (optional principal))
    (split-amount uint))
  (begin
    ;; Guard 1 (E2.3): a split may only pay an allowlisted recipient.
    (try! (validate-recipient split-address split-amount))
    ;; Guard 2 (E2.4): projected locked (real current + new lock) must stay >= floor.
    (try! (validate-reserve-floor
            (get locked-balance (contract-call? .flowvault-v2 get-vault-state tx-sender))
            lock-amount))
    ;; Compose: set the caller's rules, then deposit through flowvault-v2.
    (try! (contract-call? .flowvault-v2 set-routing-rules
            lock-amount lock-until-block split-address split-amount))
    (contract-call? .flowvault-v2 deposit token amount)))
