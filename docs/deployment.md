# Deployment record — testnet (E2.7)

Deployed **2026-07-04** to Stacks **testnet**, deployer `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799`.
All four contracts confirmed on-chain in one batch (~0.196 STX total, Clarity 3 / epoch 3.3).

| Contract | Principal | Publish txid |
|---|---|---|
| sip-010-trait | `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.sip-010-trait` | `6a8e055bb9387cdea13eb1194c6e355653b829729a5d244b2af0a9fd89efb863` |
| flowvault-v2 | `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.flowvault-v2` | `e79f6be0c03413803b7e202459c131c6d077d8f50de5e28c64854e7e9989bb05` |
| mock-usdcx | `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.mock-usdcx` | `87975609eedccbb82575db9bdf236fadcadf68bf32266d0227468b7e6759e2a9` |
| steward-router | `ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799.steward-router` | `c96caccdd2c86c7c906742bd050ebbf2c02156a46ef989777c1a5399d81fbcfb` |

Explorer: `https://explorer.hiro.so/txid/<txid>?chain=testnet`

## Architecture note (self-contained deploy)

steward-router references `.flowvault-v2` (same-deployer shorthand), so it composes over **our**
deployed instance of the FlowVault code — not the org's `STD7QG84….flowvault-v2`. This was a
deliberate choice: Clarinet requirements only resolve *mainnet* contracts, so pointing at a
testnet-only contract by full principal couldn't be validated pre-deploy. The vendored
`flowvault-v2.clar` is byte-identical to the on-chain original (pulled from testnet at publish
height 3974117), so this is the real FlowVault behaviour, self-hosted for a clean, unbreakable demo.

**Future enhancement:** target the org's official flowvault-v2 + real USDCx by switching the
reference to the full principal (`'STD7QG84….flowvault-v2`) — see ARCHITECTURE.md §5 threat model.

## Verified post-deploy

- `steward-router` interface live: `route-and-deposit`, `add-recipient`, `remove-recipient`,
  `set-reserve-floor`, `transfer-ownership`, `get-owner`, `get-reserve-floor`, `is-allowlisted`,
  `is-owner`, `validate-recipient`, `validate-reserve-floor`.
- `get-owner` → deployer (`ST2PQ72…`). Ownership initialized correctly.

## Demo token

`mock-usdcx` has a public `mint (amount recipient)` for funding demo accounts. The official USDCx
(`ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`) can be passed as the runtime `token` argument
to `route-and-deposit`, but its trait-conformance to our vendored `sip-010-trait` is untested — lead
demos with `mock-usdcx`.
