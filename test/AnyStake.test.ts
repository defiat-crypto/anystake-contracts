import { setupClaimTest, setupStakingTest, setupTest } from "./setup";
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { AnyStake, IERC20 } from "../typechain";

describe("AnyStake", () => {
  it("should deploy and setup AnyStake correctly", async () => {
    const { mastermind } = await setupTest();
    const { AnyStake, Gov, Points, Vault } = mastermind;

    const vaultAddress = await AnyStake.vault();
    const actorLevel = await Gov.viewActorLevelOf(AnyStake.address);
    const discountRate = await Points.viewDiscountOf(AnyStake.address);

    expect(vaultAddress).eq(Vault.address);
    expect(actorLevel.toNumber()).eq(2);
    expect(discountRate.toNumber()).eq(100);
  });

  it("allows deposits in each pool and reward points", async () => {
    const { alpha } = await setupStakingTest();
    const { AnyStake } = alpha;
    const { token, tokenLp, pointsLp, usdc, wbtc } = await getNamedAccounts();
    const tests = [
      { args: ["DFT", 0, token], expected: 0 },
      { args: ["DFT-LP", 1, tokenLp], expected: 0 },
      { args: ["DFTP-LP", 2, pointsLp], expected: 0 },
      { args: ["USDC", 3, usdc], expected: 0 },
      { args: ["WBTC", 4, wbtc], expected: 0 },
    ];

    for (let test of tests) {
      const pointsBefore = await alpha.Points.balanceOf(alpha.address);
      const pointStipend = await alpha.AnyStake.pointStipend();
      const Token = (await ethers.getContractAt(
        "IERC20",
        test.args[2] as string,
        alpha.address
      )) as IERC20;
      await Token.approve(
        AnyStake.address,
        ethers.constants.MaxUint256
      ).then((tx) => tx.wait());
      const balance = await Token.balanceOf(alpha.address);
      console.log(`Staking ${balance.toString()} ${test.args[0]}`);
      await AnyStake.deposit(test.args[1] as number, balance).then((tx) =>
        tx.wait()
      );
      const info = await AnyStake.userInfo(
        test.args[1] as number,
        alpha.address
      );

      const pointsAfter = await alpha.Points.balanceOf(alpha.address);

      expect(info.amount.toString()).eq(balance.toString());
      // expect(pointsBefore.add(pointStipend).toString()).eq(
      //   pointsAfter.toString()
      // );
    }
  });

  it("should allow claims of pending rewards", async () => {
    const { alpha } = await setupClaimTest();
    const { AnyStake, Token } = alpha;

    const balanceBefore = await Token.balanceOf(alpha.address);

    await AnyStake.claim(0).then((tx) => tx.wait());

    const balanceAfterLp = await Token.balanceOf(alpha.address);

    await AnyStake.claim(2).then((tx) => tx.wait());

    const balanceAfter = await Token.balanceOf(alpha.address);

    const lpReward = balanceAfterLp.sub(balanceBefore);
    const poolReward = balanceAfter.sub(balanceAfterLp);

    expect(balanceAfter.gt(balanceBefore)).true;
    expect(lpReward.gt(poolReward)).true;
  });

  it("should allow claiming all pending rewards", async () => {
    const { alpha } = await setupClaimTest();
    const { AnyStake, Token } = alpha;

    const balanceBefore = await Token.balanceOf(alpha.address);

    await AnyStake.claim(0).then((tx) => tx.wait());
    await AnyStake.claim(1).then((tx) => tx.wait());
    await AnyStake.claim(2).then((tx) => tx.wait());
    await AnyStake.claim(3).then((tx) => tx.wait());

    const balanceAfter = await Token.balanceOf(alpha.address);
    const lpRewardPending = await AnyStake.pending(0, alpha.address);
    const poolRewardPending = await AnyStake.pending(2, alpha.address);

    expect(balanceAfter.gt(balanceBefore)).true;
    expect(lpRewardPending.toNumber()).eq(0);
    expect(poolRewardPending.toNumber()).eq(0);
  });

  it("should reject claims when no staked balance", async () => {
    const { beta } = await setupTest();
    const { AnyStake } = beta;

    expect(AnyStake.claim(0)).to.be.reverted;
    // expect(AnyStake.claimAll()).to.be.reverted;
  });

  it("should allow withdraws from staking pools and buyback", async () => {
    const { alpha } = await setupClaimTest();
    const { AnyStake, Token, Vault } = alpha;
    const { token, tokenLp, usdc, wbtc } = await getNamedAccounts();

    const tests = [
      { args: ["DFT", 0, token], expected: 0 },
      { args: ["DFT/ETH", 1, tokenLp], expected: 0 },
      { args: ["USDC", 3, usdc], expected: 0 },
      // { args: ["WBTC", 3, wbtc], expected: 0 },
    ];

    for (let test of tests) {
      const subjectToken = (await ethers.getContractAt(
        "IERC20",
        test.args[2] as string,
        alpha.address
      )) as IERC20;

      const info = await AnyStake.userInfo(test.args[1], alpha.address);
      const price = await Vault.getTokenPrice(Token.address, tokenLp);
      const rewards = await Token.balanceOf(Vault.address);
      const balance = await subjectToken.balanceOf(alpha.address);

      await AnyStake.withdraw(test.args[1], info.amount).then((tx) =>
        tx.wait()
      );

      const infoAfter = await AnyStake.userInfo(test.args[1], alpha.address);
      const priceAfter = await Vault.getTokenPrice(Token.address, tokenLp);
      const rewardsAfter = await Token.balanceOf(Vault.address);
      const balanceAfter = await subjectToken.balanceOf(alpha.address);

      expect(infoAfter.amount.toNumber()).eq(0);

      if (test.args[1] >= 3) {
        expect(priceAfter.gt(price)).true;
        expect(rewardsAfter.gt(rewards)).true;
        expect(balanceAfter.sub(balance).eq(info.amount.mul(95).div(100)));
      } else {
        expect(balanceAfter.sub(balance).gte(info.amount)).true;
      }
    }
  });

  it("should reject withdraws when invalid", async () => {
    const { alpha, beta } = await setupTest();

    // withdraw = 0
    // withdraw > staked
    expect(beta.AnyStake.withdraw(0, "0")).to.be.reverted;
    // expect(AnyStakeBeta.withdraw(0, '1')).to.be.reverted;
  });
});
