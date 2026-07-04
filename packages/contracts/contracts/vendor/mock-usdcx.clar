;; mock-usdcx -- a minimal SIP-010 token for SIMNET TESTING ONLY.
;; Stands in for the real testnet USDCx (ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx)
;; so integration tests can perform real deposits. `mint` is test-only sugar.
(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token usdcx)

(define-constant ERR-NOT-SENDER (err u1))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-SENDER)
    (try! (ft-transfer? usdcx amount sender recipient))
    (match memo m (print m) 0x)
    (ok true)))

(define-read-only (get-name) (ok "Mock USDCx"))
(define-read-only (get-symbol) (ok "USDCx"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance usdcx who)))
(define-read-only (get-total-supply) (ok (ft-get-supply usdcx)))
(define-read-only (get-token-uri) (ok none))

;; Test-only: mint tokens to fund simnet accounts.
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? usdcx amount recipient))
