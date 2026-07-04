import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// steward-router — E2.2 ownership + admin tests.
// The contract's `owner` initializes to tx-sender at deploy time => the deployer.
// wallet_1 / wallet_2 are non-owners used to prove the ERR-NOT-OWNER gate.

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const CONTRACT = "steward-router";
const ERR_NOT_OWNER = Cl.uint(100);
const ERR_NOT_ALLOWLISTED = Cl.uint(101);
const ERR_BELOW_RESERVE_FLOOR = Cl.uint(102);
const ERR_FUNDS_LOCKED = Cl.uint(1003); // flowvault-v2's guarantee — the money-shot

describe("ownership", () => {
  it("initializes the deployer as owner", () => {
    const { result } = simnet.callReadOnlyFn(CONTRACT, "get-owner", [], deployer);
    expect(result).toBePrincipal(deployer);
  });

  it("reports is-owner correctly", () => {
    expect(simnet.callReadOnlyFn(CONTRACT, "is-owner", [Cl.principal(deployer)], deployer).result).toBeBool(true);
    expect(simnet.callReadOnlyFn(CONTRACT, "is-owner", [Cl.principal(wallet1)], deployer).result).toBeBool(false);
  });
});

describe("admin writes — owner path", () => {
  it("owner can add and remove an allowlisted recipient", () => {
    expect(simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet1)], deployer).result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(CONTRACT, "is-allowlisted", [Cl.principal(wallet1)], deployer).result).toBeBool(true);

    expect(simnet.callPublicFn(CONTRACT, "remove-recipient", [Cl.principal(wallet1)], deployer).result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(CONTRACT, "is-allowlisted", [Cl.principal(wallet1)], deployer).result).toBeBool(false);
  });

  it("owner can set the reserve floor", () => {
    expect(simnet.callPublicFn(CONTRACT, "set-reserve-floor", [Cl.uint(500_000)], deployer).result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(CONTRACT, "get-reserve-floor", [], deployer).result).toBeUint(500_000);
  });

  it("unknown recipient reads as not allowlisted (default false)", () => {
    expect(simnet.callReadOnlyFn(CONTRACT, "is-allowlisted", [Cl.principal(wallet2)], deployer).result).toBeBool(false);
  });
});

describe("admin writes — the ERR-NOT-OWNER gate (E2.2 acceptance)", () => {
  it("rejects add-recipient from a non-owner", () => {
    expect(simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet2)], wallet1).result).toBeErr(ERR_NOT_OWNER);
    // ...and no state changed:
    expect(simnet.callReadOnlyFn(CONTRACT, "is-allowlisted", [Cl.principal(wallet2)], deployer).result).toBeBool(false);
  });

  it("rejects remove-recipient from a non-owner", () => {
    expect(simnet.callPublicFn(CONTRACT, "remove-recipient", [Cl.principal(wallet1)], wallet1).result).toBeErr(ERR_NOT_OWNER);
  });

  it("rejects set-reserve-floor from a non-owner", () => {
    expect(simnet.callPublicFn(CONTRACT, "set-reserve-floor", [Cl.uint(1)], wallet2).result).toBeErr(ERR_NOT_OWNER);
  });

  it("rejects transfer-ownership from a non-owner", () => {
    expect(simnet.callPublicFn(CONTRACT, "transfer-ownership", [Cl.principal(wallet1)], wallet1).result).toBeErr(ERR_NOT_OWNER);
  });
});

describe("validate-recipient — allowlist enforcement (E2.3 acceptance)", () => {
  it("allows a split to an allowlisted recipient", () => {
    // owner (still deployer here) allowlists wallet1
    simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet1)], deployer);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "validate-recipient", [Cl.some(Cl.principal(wallet1)), Cl.uint(300_000)], deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("REJECTS a split to a non-allowlisted recipient with ERR-NOT-ALLOWLISTED", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "validate-recipient", [Cl.some(Cl.principal(wallet2)), Cl.uint(300_000)], deployer,
    );
    expect(result).toBeErr(ERR_NOT_ALLOWLISTED);
  });

  it("REJECTS a positive split with no recipient (mirrors code 1007)", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "validate-recipient", [Cl.none(), Cl.uint(300_000)], deployer,
    );
    expect(result).toBeErr(ERR_NOT_ALLOWLISTED);
  });

  it("allows a zero split regardless of recipient (pure lock/hold, no payee)", () => {
    expect(
      simnet.callReadOnlyFn(CONTRACT, "validate-recipient", [Cl.none(), Cl.uint(0)], deployer).result,
    ).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn(CONTRACT, "validate-recipient", [Cl.some(Cl.principal(wallet2)), Cl.uint(0)], deployer).result,
    ).toBeOk(Cl.bool(true));
  });
});

describe("validate-reserve-floor — reserve enforcement (E2.4 acceptance)", () => {
  const setFloor = (n: number) => simnet.callPublicFn(CONTRACT, "set-reserve-floor", [Cl.uint(n)], deployer);
  const check = (currentLocked: number, lockAmount: number) =>
    simnet.callReadOnlyFn(CONTRACT, "validate-reserve-floor", [Cl.uint(currentLocked), Cl.uint(lockAmount)], deployer).result;

  it("passes any projection when the floor is zero", () => {
    setFloor(0);
    expect(check(0, 0)).toBeOk(Cl.bool(true));
  });

  it("passes when projected locked exceeds the floor", () => {
    setFloor(500_000);
    expect(check(0, 600_000)).toBeOk(Cl.bool(true)); // 600k >= 500k
  });

  it("passes when projected locked exactly equals the floor (inclusive boundary)", () => {
    setFloor(500_000);
    expect(check(100_000, 400_000)).toBeOk(Cl.bool(true)); // 500k >= 500k
  });

  it("counts already-locked balance toward the floor", () => {
    setFloor(500_000);
    expect(check(500_000, 0)).toBeOk(Cl.bool(true)); // already at floor, no new lock needed
  });

  it("REJECTS when the projection would fall below the floor", () => {
    setFloor(500_000);
    expect(check(0, 400_000)).toBeErr(ERR_BELOW_RESERVE_FLOOR); // 400k < 500k
  });
});

describe("route-and-deposit — composition over flowvault-v2 (E2.5)", () => {
  const wallet3 = accounts.get("wallet_3")!;
  const wallet4 = accounts.get("wallet_4")!;
  const TOKEN = Cl.contractPrincipal(deployer, "mock-usdcx");
  const mint = (to: string, n: number) =>
    simnet.callPublicFn("mock-usdcx", "mint", [Cl.uint(n), Cl.principal(to)], deployer);
  const setFloor = (n: number) => simnet.callPublicFn(CONTRACT, "set-reserve-floor", [Cl.uint(n)], deployer);

  it("routes a deposit through the guards: split to allowlisted recipient, lock reserve, hold rest", () => {
    setFloor(0);
    simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet1)], deployer);
    mint(wallet2, 1_000_000);
    const unlockBlock = simnet.blockHeight + 1000;

    // operator wallet2: deposit 1_000_000 = split 300k -> wallet1, lock 400k, hold-in-vault 700k
    const { result } = simnet.callPublicFn(
      CONTRACT, "route-and-deposit",
      [TOKEN, Cl.uint(1_000_000), Cl.uint(400_000), Cl.uint(unlockBlock), Cl.some(Cl.principal(wallet1)), Cl.uint(300_000)],
      wallet2,
    );
    expect(result).toBeOk(
      Cl.tuple({ deposited: Cl.uint(1_000_000), held: Cl.uint(700_000), split: Cl.uint(300_000), locked: Cl.uint(400_000) }),
    );

    // flowvault-v2 now reports locked funds for wallet2, and wallet1 received the split.
    expect(simnet.callReadOnlyFn("flowvault-v2", "has-locked-funds", [Cl.principal(wallet2)], wallet2).result).toBeBool(true);
    expect(simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet1)], wallet1).result).toBeOk(Cl.uint(300_000));
  });

  it("REJECTS a deposit that splits to a non-allowlisted recipient (guard runs before any transfer)", () => {
    setFloor(0);
    mint(wallet2, 1_000_000);
    const unlockBlock = simnet.blockHeight + 1000;
    const balBefore = simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet2)], wallet2).result;

    const { result } = simnet.callPublicFn(
      CONTRACT, "route-and-deposit",
      [TOKEN, Cl.uint(1_000_000), Cl.uint(0), Cl.uint(unlockBlock), Cl.some(Cl.principal(wallet3)), Cl.uint(300_000)],
      wallet2,
    );
    expect(result).toBeErr(ERR_NOT_ALLOWLISTED);
    // No tokens moved — the guard aborted before flowvault-v2 was ever called.
    expect(simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet2)], wallet2).result).toStrictEqual(balBefore);
  });

  it("REJECTS a deposit that would leave locked below the reserve floor", () => {
    setFloor(500_000);
    mint(wallet4, 1_000_000); // fresh operator => real current-locked is 0
    const unlockBlock = simnet.blockHeight + 1000;
    // lock only 400k; projected 0 + 400k = 400k < 500k floor
    const { result } = simnet.callPublicFn(
      CONTRACT, "route-and-deposit",
      [TOKEN, Cl.uint(1_000_000), Cl.uint(400_000), Cl.uint(unlockBlock), Cl.none(), Cl.uint(0)],
      wallet4,
    );
    expect(result).toBeErr(ERR_BELOW_RESERVE_FLOOR);
  });
});

describe("the money-shot: locked reserve cannot be drained early (E2.6)", () => {
  const op = accounts.get("wallet_5")!;
  const TOKEN = Cl.contractPrincipal(deployer, "mock-usdcx");

  it("blocks early withdrawal of the locked reserve, allows the unlocked part, then releases on unlock", () => {
    simnet.callPublicFn(CONTRACT, "set-reserve-floor", [Cl.uint(0)], deployer);
    simnet.callPublicFn("mock-usdcx", "mint", [Cl.uint(1_000_000), Cl.principal(op)], deployer);
    const unlockBlock = simnet.blockHeight + 50;

    // Deposit 1M with a 400k locked reserve, no split => vault holds 1M: 400k locked, 600k unlocked.
    const dep = simnet.callPublicFn(
      CONTRACT, "route-and-deposit",
      [TOKEN, Cl.uint(1_000_000), Cl.uint(400_000), Cl.uint(unlockBlock), Cl.none(), Cl.uint(0)],
      op,
    );
    expect(dep.result).toBeOk(
      Cl.tuple({ deposited: Cl.uint(1_000_000), held: Cl.uint(1_000_000), split: Cl.uint(0), locked: Cl.uint(400_000) }),
    );
    expect(simnet.callReadOnlyFn("flowvault-v2", "has-locked-funds", [Cl.principal(op)], op).result).toBeBool(true);

    // 🔴 ATTACK: try to withdraw the FULL 1M (including the locked 400k) before unlock.
    const attack = simnet.callPublicFn("flowvault-v2", "withdraw", [TOKEN, Cl.uint(1_000_000)], op);
    expect(attack.result).toBeErr(ERR_FUNDS_LOCKED); // the vault refuses — funds sit safe

    // 🟢 The 600k UNLOCKED portion is still spendable.
    const ok600 = simnet.callPublicFn("flowvault-v2", "withdraw", [TOKEN, Cl.uint(600_000)], op);
    expect(ok600.result).toBeOk(Cl.tuple({ withdrawn: Cl.uint(600_000), remaining: Cl.uint(400_000) }));
    // The reserve is still locked and still un-drainable.
    expect(simnet.callPublicFn("flowvault-v2", "withdraw", [TOKEN, Cl.uint(400_000)], op).result).toBeErr(ERR_FUNDS_LOCKED);

    // ⏭ Advance past the unlock height — now (and only now) the reserve is withdrawable.
    simnet.mineEmptyBlocks(60);
    expect(simnet.callReadOnlyFn("flowvault-v2", "has-locked-funds", [Cl.principal(op)], op).result).toBeBool(false);
    const afterUnlock = simnet.callPublicFn("flowvault-v2", "withdraw", [TOKEN, Cl.uint(400_000)], op);
    expect(afterUnlock.result).toBeOk(Cl.tuple({ withdrawn: Cl.uint(400_000), remaining: Cl.uint(0) }));
  });
});

describe("transfer-ownership", () => {
  // Runs last: it permanently changes the owner for the remainder of the file.
  it("moves authority to the new owner and locks out the old one", () => {
    // Old owner (deployer) hands off to wallet1.
    expect(simnet.callPublicFn(CONTRACT, "transfer-ownership", [Cl.principal(wallet1)], deployer).result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(CONTRACT, "get-owner", [], deployer).result).toBePrincipal(wallet1);

    // The former owner can no longer administer.
    expect(simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet2)], deployer).result).toBeErr(ERR_NOT_OWNER);

    // The new owner can.
    expect(simnet.callPublicFn(CONTRACT, "add-recipient", [Cl.principal(wallet2)], wallet1).result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(CONTRACT, "is-allowlisted", [Cl.principal(wallet2)], deployer).result).toBeBool(true);
  });
});
