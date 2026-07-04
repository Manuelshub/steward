"use client";
import { useEffect, useState } from "react";
import { connect, disconnect, getLocalStorage, isConnected } from "@stacks/connect";

/** Wallet connect via @stacks/connect (Leather/Xverse). Reads only — no operator key here. */
export function WalletButton() {
  const [addr, setAddr] = useState<string | null>(null);

  const current = (): string | null => {
    const data = getLocalStorage() as { addresses?: { stx?: { address: string }[] } } | undefined;
    return data?.addresses?.stx?.[0]?.address ?? null;
  };

  useEffect(() => {
    if (isConnected()) setAddr(current());
  }, []);

  const onConnect = async () => {
    await connect();
    setAddr(current());
  };
  const onDisconnect = () => {
    disconnect();
    setAddr(null);
  };

  return addr ? (
    <button className="btn" onClick={onDisconnect} title={addr}>
      {addr.slice(0, 6)}…{addr.slice(-4)} · disconnect
    </button>
  ) : (
    <button className="btn btn-active" onClick={onConnect}>
      Connect wallet
    </button>
  );
}
