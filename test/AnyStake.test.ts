import { setupTest } from "./setup";
import { expect } from "chai";

describe("AnyStake", () => {
  it("should deploy and setup AnyStake correctly", async () => {
    const { mastermind } = await setupTest();
    const { AnyStake, Vault } = mastermind;

    const vaultAddress = await AnyStake.vault();

    expect(vaultAddress).eq(Vault.address);
  });

  describe("deposit()", () => {
    const tests = [
      { args: ["DFT-LP", 0], expected: 0 },
      { args: ["DFT-LP", 0], expected: 0 },
      { args: ["DFT-LP", 0], expected: 0 },
      { args: ["DFT-LP", 0], expected: 0 },
      { args: ["DFT-LP", 0], expected: 0 },
      { args: ["DFT-LP", 0], expected: 0 },
    ];

    tests.forEach((test) => {
      it(
        "should allow deposits of " + test.args[0] + " in PID: " + test.args[1],
        async () => {}
      );
    });
  });

  it("should allow claims of pending rewards", async () => {});

  it("should reject claims when no staked balance", async () => {
    const { beta } = await setupTest();
    const { AnyStake } = beta;

    expect(AnyStake.claim(0)).to.be.reverted;
    expect(AnyStake.claimAll()).to.be.reverted;
  });

  it("should allow withdraws from staking pools", async () => {});

  it("should reject withdraws when invalid", async () => {
    const { alpha, beta } = await setupTest();

    // withdraw = 0
    // withdraw > staked
    expect(beta.AnyStake.withdraw(0, "0")).to.be.reverted;
    // expect(AnyStakeBeta.withdraw(0, '1')).to.be.reverted;
  });
});
