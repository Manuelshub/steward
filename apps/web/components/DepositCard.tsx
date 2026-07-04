"use client";
import { useEffect, useState } from "react";
import { getLocalStorage } from "@stacks/connect";
import { txUrl } from "@/lib/config";
import { fetchHeight, mintTestTokens, routeAndDeposit } from "@/lib/stacks";

/** Try-it-yourself: mint test USDCx, then run a guarded route-and-deposit from your own wallet. */
export function DepositCard() {
  const [addr, setAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [feed, setFeed] = useState<{ label: string; txid: string }[]>([]);

  useEffect(() => {
    const d = getLocalStorage() as { addresses?: { stx?: { address: string }[] } } | undefined;
    setAddr(d?.addresses?.stx?.[0]?.address ?? null);
  }, []);

  const run = async (label: string, fn: () => Promise<string>) => {
    setErr(null);
    setBusy(label);
    try {
      const txid = await fn();
      if (txid) setFeed((f) => [{ label, txid }, ...f]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onMint = () => run("mint 1 test USDCx", () => mintTestTokens(addr!, 1_000_000n));
  const onDeposit = () =>
    run("route-and-deposit (lock 0.4 reserve)", async () => {
      const height = await fetchHeight();
      return routeAndDeposit({ amount: 1_000_000n, lock: 400_000n, lockUntil: height + 200 });
    });

  return (
    <section className="card">
      <h2>Try it yourself</h2>
      <p className="muted small">Sign a real guarded deposit from your own wallet on testnet.</p>

      {!addr ? (
        <p className="muted small" style={{ marginTop: 12 }}>Connect a wallet above to enable these actions.</p>
      ) : (
        <>
          <div className="row" style={{ margin: "14px 0" }}>
            <button className="btn" disabled={!!busy} onClick={onMint}>
              {busy === "mint 1 test USDCx" ? "signing…" : "1 · Mint 1 test USDCx"}
            </button>
            <button className="btn btn-primary" disabled={!!busy} onClick={onDeposit}>
              {busy?.startsWith("route") ? "signing…" : "2 · Route & deposit"}
            </button>
          </div>
          {err && <p className="badge badge-err">{err}</p>}
          {feed.length > 0 && (
            <ol className="trail" style={{ marginTop: 10 }}>
              {feed.map((f) => (
                <li key={f.txid} className="trail-item trail-ok">
                  <div className="row-between">
                    <span className="small">{f.label}</span>
                    <a className="link small" href={txUrl(f.txid)} target="_blank" rel="noreferrer">
                      {f.txid.slice(0, 10)}… ↗
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
