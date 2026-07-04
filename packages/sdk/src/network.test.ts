import assert from "node:assert/strict";
import { test } from "node:test";
import { addressNetwork, assertSameNetwork } from "./network.js";

const TESTNET_FV = "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2";
const TESTNET_TOK = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx";
const MAINNET_ADDR = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7";

test("addressNetwork infers testnet from ST/SN, mainnet from SP/SM", () => {
  assert.equal(addressNetwork(TESTNET_FV), "testnet");
  assert.equal(addressNetwork(TESTNET_TOK), "testnet");
  assert.equal(addressNetwork(MAINNET_ADDR), "mainnet");
  assert.equal(addressNetwork("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4"), "mainnet");
  assert.equal(addressNetwork("garbage"), null);
});

test("assertSameNetwork passes when all principals match the network", () => {
  assert.doesNotThrow(() => assertSameNetwork("testnet", [TESTNET_FV, TESTNET_TOK]));
});

test("assertSameNetwork skips empty/undefined entries", () => {
  assert.doesNotThrow(() => assertSameNetwork("testnet", [TESTNET_FV, undefined, ""]));
});

test("assertSameNetwork throws on a mixed-network pair (the footgun)", () => {
  assert.throws(
    () => assertSameNetwork("testnet", [TESTNET_FV, MAINNET_ADDR]),
    /is on mainnet, but configured network is testnet/,
  );
});

test("assertSameNetwork throws on an unrecognized principal", () => {
  assert.throws(() => assertSameNetwork("testnet", ["not-an-address"]), /unrecognized Stacks principal/);
});
