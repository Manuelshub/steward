import { AttackDemo } from "@/components/AttackDemo";
import { Architecture, DeployedContracts, Guardrails, HowItWorks, Primitives, StatBar } from "@/components/Content";
import { DepositCard } from "@/components/DepositCard";
import { ProposalFeed } from "@/components/ProposalFeed";
import { VaultPanel } from "@/components/VaultPanel";
import { WalletButton } from "@/components/WalletButton";
import { addressUrl, CONFIG, contractUrl, txUrl } from "@/lib/config";

const DEPLOYER = CONFIG.router.split(".")[0];

export default function Page() {
  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <span className="brand-dot" />
          Steward
        </div>
        <WalletButton />
      </div>

      <section className="hero">
        <h1>
          An autonomous treasury agent that <span className="grad">can&apos;t rug you</span>.
        </h1>
        <p>
          An AI proposes how the treasury routes its money each cycle. A deterministic compiler clamps
          every proposal, and the vault enforces it on-chain. Even a fully compromised agent cannot move
          funds outside the rules — because the vault holds the authority, not the AI.
        </p>
        <span className="pill">
          <span className="pulse" /> live on Stacks testnet ·{" "}
          <a className="link" href={txUrl(CONFIG.evidence.moneyShot)} target="_blank" rel="noreferrer">
            money-shot tx ↗
          </a>
        </span>
        <StatBar />
      </section>

      <AttackDemo />

      <HowItWorks />
      <Guardrails />

      <section className="section">
        <p className="eyebrow">Live</p>
        <h2>State &amp; audit trail</h2>
        <p className="lead">Real balances from the deployed vault, and the real transactions behind them.</p>
        <div className="grid2">
          <VaultPanel />
          <ProposalFeed />
        </div>
      </section>

      <DepositCard />

      <Primitives />
      <DeployedContracts />
      <Architecture />

      <footer>
        <div className="site-footer">
          <div className="foot-brand">
            <div className="brand">
              <span className="brand-dot" />
              Steward
            </div>
            <p>
              An autonomous treasury agent that can&apos;t rug you — the vault holds the rules, not the AI.
              Built on FlowVault, on Stacks.
            </p>
          </div>
          <div className="foot-col">
            <h5>On-chain</h5>
            <a href={addressUrl(DEPLOYER)} target="_blank" rel="noreferrer">Deployed contracts ↗</a>
            <a href={txUrl(CONFIG.evidence.moneyShot)} target="_blank" rel="noreferrer">Money-shot transaction ↗</a>
            <a href={contractUrl(CONFIG.router)} target="_blank" rel="noreferrer">steward-router ↗</a>
          </div>
          <div className="foot-col">
            <h5>Ecosystem</h5>
            <a href="https://flow-vault.dev" target="_blank" rel="noreferrer">FlowVault ↗</a>
            <a href="https://docs.flow-vault.dev" target="_blank" rel="noreferrer">FlowVault docs ↗</a>
            <a href="https://www.stacks.co" target="_blank" rel="noreferrer">Stacks ↗</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>Stacks testnet · deployer {DEPLOYER.slice(0, 6)}…{DEPLOYER.slice(-4)}</span>
          <span>Built for the FlowVault Builder Bounty · 2026</span>
        </div>
      </footer>
    </main>
  );
}
