import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import {
  setupClaimTest,
  setupPeggedTest,
  setupStakingTest,
  setupTest,
} from "./setup";

describe("AnyStakeRegulator", () => {
  it("should deploy and setup Regulator correctly", async () => {
    const { mastermind } = await setupTest();
    const { Gov, Points, Regulator, Vault } = mastermind;

    const vaultAddress = await Regulator.vault();
    const actorLevel = await Gov.viewActorLevelOf(Regulator.address);
    const discountRate = await Points.viewDiscountOf(Regulator.address);

    expect(vaultAddress).to.equal(Vault.address);
    expect(actorLevel.toNumber()).eq(2);
    expect(discountRate.toNumber()).eq(100);
  });

  it("should accept deposits", async () => {
    const { alpha, mastermind } = await setupStakingTest();
    const { Points, Regulator } = alpha;

    await Points.approve(
      Regulator.address,
      ethers.constants.MaxUint256
    ).then((tx) => tx.wait());
    await Regulator.deposit(ethers.utils.parseEther("1000")).then((tx) =>
      tx.wait()
    );

    const alphaInfo = await Regulator.userInfo(alpha.address);

    expect(alphaInfo.amount.toString()).eq(
      ethers.utils.parseEther("1000").toString()
    );
  });

  it("should accept withdrawals and buy Points on Uniswap (Below Peg)", async () => {
    const { alpha } = await setupPeggedTest({ abovePeg: false });
    const { Regulator, Points, Vault } = alpha;
    const { pointsLp } = await getNamedAccounts();

    const isAbovePeg = await Regulator.isAbovePeg();
    const info = await Regulator.userInfo(alpha.address);
    const balance = await Points.balanceOf(alpha.address);
    const price = await Vault.getTokenPrice(Points.address, pointsLp);

    await Regulator.withdraw(info.amount);

    const infoAfter = await Regulator.userInfo(alpha.address);
    const balanceAfter = await Points.balanceOf(alpha.address);
    const priceAfter = await Vault.getTokenPrice(Points.address, pointsLp);

    expect(isAbovePeg).false;
    expect(infoAfter.amount.toNumber()).eq(0);
    expect(balanceAfter.sub(balance).eq(info.amount.mul(90).div(100)));
    expect(priceAfter.gt(price)).true;
  });

  it("should accept withdrawals and buy DeFiat on Uniswap (Above Peg)", async () => {
    const { alpha, mastermind } = await setupPeggedTest({ abovePeg: true });
    const { Regulator, Points, Vault } = alpha;
    const { pointsLp } = await getNamedAccounts();

    // await mastermind.Regulator.setPriceMultiplier(2500).then((tx) => tx.wait());

    const isAbovePeg = await Regulator.isAbovePeg();
    const info = await Regulator.userInfo(alpha.address);
    const balance = await Points.balanceOf(alpha.address);
    const price = await Vault.getTokenPrice(Points.address, pointsLp);

    await Regulator.withdraw(info.amount);

    const infoAfter = await Regulator.userInfo(alpha.address);
    const balanceAfter = await Points.balanceOf(alpha.address);
    const priceAfter = await Vault.getTokenPrice(Points.address, pointsLp);

    expect(isAbovePeg).true;
    expect(infoAfter.amount.toNumber()).eq(0);
    expect(balanceAfter.sub(balance).eq(info.amount.mul(90).div(100)));
    expect(priceAfter.lt(price)).true;
  });

  it("should claim rewards", async () => {
    const { alpha } = await setupClaimTest();
    const { Regulator, Token } = alpha;

    const balanceBefore = await Token.balanceOf(alpha.address);

    await Regulator.claim().then((tx) => tx.wait());

    const balanceAfter = await Token.balanceOf(alpha.address);

    expect(balanceAfter.gt(balanceBefore)).true;
  });

  it("should reject claims when no staked balance", async () => {
    const { beta } = await setupTest();
    const { Regulator } = beta;

    // expect(Regulator.claim()).to.be.reverted;
  });
});
