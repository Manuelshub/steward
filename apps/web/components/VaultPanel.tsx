"use client";
import { useEffect, useState } from "react";
import { CONFIG, formatUsdcx, txUrl } from "@/lib/config";
import { OWNER } from "@/lib/samples";
import { readVaultState, type VaultView } from "@/lib/stacks";

/** Live on-chain vault state for the demo treasury, polled from the deployed flowvault-v2. */
export function VaultPanel() {
  const [state, setState] = useState<VaultView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await readVaultState(OWNER);
        if (alive) { setState(s); setErr(null); }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const locked = state ? state.lockUntilBlock > state.currentBlock && state.lockedBalance > 0n : false;

  return (
    <section className="card">
      <h2>Live vault state</h2>
      <p className="muted small">Treasury {OWNER.slice(0, 8)}… on flowvault-v2 · polled every 15s</p>
      {err && <p className="badge badge-err">read error: {err}</p>}
      {!state && !err && <p className="muted">loading…</p>}
      {state && (
        <>
          <div className="stat-row">
            <div className="stat"><span className="muted small">total</span><b>{formatUsdcx(state.totalBalance)} USDCx</b></div>
            <div className="stat"><span className="muted small">unlocked</span><b className="ok">{formatUsdcx(state.unlockedBalance)}</b></div>
            <div className="stat"><span className="muted small">locked reserve</span><b className="warn">{formatUsdcx(state.lockedBalance)}</b></div>
          </div>
          <p className="mono small">
            block {String(state.currentBlock)} · unlocks at {String(state.lockUntilBlock)}{" "}
            {locked ? <span className="badge badge-warn">🔒 reserve locked</span> : <span className="badge badge-ok">unlocked</span>}
          </p>
        </>
      )}
      <a className="link small" href={txUrl(CONFIG.evidence.deposit)} target="_blank" rel="noreferrer">
        last routing tx ↗
      </a>
    </section>
  );
}
