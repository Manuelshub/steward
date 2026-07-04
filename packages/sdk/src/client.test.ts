import assert from "node:assert/strict";
import { test } from "node:test";
import { StewardVault, splitPrincipal } from "./client.js";

const FV = "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2";
const TOK = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx";

test("splitPrincipal parses ADDR.name and rejects malformed input", () => {
  assert.deepEqual(splitPrincipal(FV), { address: "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD", name: "flowvault-v2" });
  assert.throws(() => splitPrincipal("STD7QG84"), /ADDR\.name/);
});

test("StewardVault constructs with consistent testnet config", () => {
  assert.doesNotThrow(() => new StewardVault({ network: "testnet", flowvaultContract: FV, tokenContract: TOK }));
});

test("StewardVault rejects a mixed-network config at construction (E3.1)", () => {
  assert.throws(
    () => new StewardVault({
      network: "testnet",
      flowvaultContract: FV,
      tokenContract: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.usdcx", // mainnet token
    }),
    /is on mainnet, but configured network is testnet/,
  );
});
