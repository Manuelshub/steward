/**
 * Live testnet smoke test for the deployed Steward contracts.
 *
 * Drives the deployed steward-router + flowvault-v2 + mock-usdcx end-to-end:
 *   mint -> set floor -> allowlist -> route-and-deposit -> money-shot withdraw (locked) -> unlocked withdraw
 *
 * SECURITY: the operator mnemonic is read LOCALLY from settings/Testnet.toml (gitignored) and
 * never leaves this machine. Run: `node scripts/smoke.mjs` from packages/contracts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Cl,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
  getAddressFromPrivateKey,
} from "@stacks/transactions";
import { generateWallet } from "@stacks/wallet-sdk";

const API = "https://api.testnet.hiro.so";
const NETWORK = "testnet";
const FEE = 60000n; // 0.06 STX per tx — comfortable for contract calls with transfers

const DEPLOYER = "ST2PQ72SDAPWV64WH0K5ZH0HK4FPMFMAPV583Z799";
const ROUTER = `${DEPLOYER}.steward-router`;
const FLOW = `${DEPLOYER}.flowvault-v2`;
const TOKEN = `${DEPLOYER}.mock-usdcx`;
const RECIPIENT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"; // allowlisted payee (≠ owner)

function readMnemonic() {
  const here = dirname(fileURLToPath(import.meta.url));
  const toml = readFileSync(join(here, "..", "settings", "Testnet.toml"), "utf8");
  const m = toml.match(/^\s*mnemonic\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("no plaintext `mnemonic = \"...\"` in settings/Testnet.toml");
  return m[1].trim();
}

async function getJson(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

async function main() {
  const mnemonic = readMnemonic();
  const wallet = await generateWallet({ secretKey: mnemonic, password: "" });
  const senderKey = wallet.accounts[0].stxPrivateKey;
  const address = getAddressFromPrivateKey(senderKey, NETWORK);
  if (address !== DEPLOYER) {
    throw new Error(`derived address ${address} != expected ${DEPLOYER}; check the mnemonic account`);
  }

  const info = await getJson(`${API}/v2/info`);
  const height = info.stacks_tip_height;
  const lockUntil = height + 200; // safely in the future when the deposit executes
  const acct = await getJson(`${API}/v2/accounts/${address}?proof=0`);
  let nonce = BigInt(acct.nonce);

  const contract = (id) => {
    const [a, n] = id.split(".");
    return { contractAddress: a, contractName: n };
  };

  const calls = [
    { id: TOKEN, fn: "mint", args: [Cl.uint(2_000_000), Cl.principal(address)], label: "mint 2 mock-USDCx to self" },
    { id: ROUTER, fn: "set-reserve-floor", args: [Cl.uint(0)], label: "set reserve floor = 0" },
    { id: ROUTER, fn: "add-recipient", args: [Cl.principal(RECIPIENT)], label: "allowlist payout recipient" },
    {
      id: ROUTER, fn: "route-and-deposit",
      args: [Cl.principal(TOKEN), Cl.uint(1_000_000), Cl.uint(400_000), Cl.uint(lockUntil), Cl.some(Cl.principal(RECIPIENT)), Cl.uint(300_000)],
      label: "route-and-deposit: split 300k, lock 400k, hold 300k",
    },
    { id: FLOW, fn: "withdraw", args: [Cl.principal(TOKEN), Cl.uint(700_000)], label: "MONEY-SHOT: drain full vault (expect ERR-FUNDS-LOCKED u1003)" },
    { id: FLOW, fn: "withdraw", args: [Cl.principal(TOKEN), Cl.uint(300_000)], label: "withdraw unlocked 300k (expect ok)" },
  ];

  console.log(`Operator ${address} — starting nonce ${nonce}, lock-until block ${lockUntil}\n`);
  const results = [];
  for (const call of calls) {
    const tx = await makeContractCall({
      ...contract(call.id),
      functionName: call.fn,
      functionArgs: call.args,
      senderKey,
      network: NETWORK,
      fee: FEE,
      nonce,
      postConditionMode: PostConditionMode.Allow,
      validateWithAbi: false,
    });
    const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
    const txid = res.txid ?? res.error ?? "?";
    console.log(`  #${nonce} ${call.label}\n      -> ${txid}`);
    results.push({ ...call, txid: res.txid });
    nonce += 1n;
  }

  console.log("\nBroadcast complete. Polling for on-chain results (up to ~6 min)...\n");
  const deadline = Date.now() + 6 * 60 * 1000;
  const pending = new Set(results.filter((r) => r.txid).map((r) => r.txid));
  const status = {};
  while (pending.size > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    for (const txid of [...pending]) {
      const t = await getJson(`${API}/extended/v1/tx/0x${txid}`);
      if (t.tx_status && t.tx_status !== "pending") {
        status[txid] = { st: t.tx_status, result: t.tx_result?.repr ?? "" };
        pending.delete(txid);
      }
    }
    process.stdout.write(`  ...${results.length - pending.size}/${results.length} settled\r`);
  }

  console.log("\n\n=== RESULTS ===");
  for (const r of results) {
    const s = r.txid ? status[r.txid] : null;
    console.log(`- ${r.label}`);
    console.log(`    tx: ${r.txid ?? "(broadcast error)"}`);
    if (s) console.log(`    status: ${s.st}   result: ${s.result}`);
    else if (r.txid) console.log(`    status: still pending (check explorer)`);
    console.log(`    https://explorer.hiro.so/txid/0x${r.txid}?chain=testnet`);
  }
}

main().catch((e) => {
  console.error("smoke test failed:", e.message);
  process.exitCode = 1;
});
