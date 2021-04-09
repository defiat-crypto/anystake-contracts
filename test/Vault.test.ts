import { ethers } from "hardhat";
import { expect } from "chai";
import {
  setupAnyStakeClaimTest,
  setupRegulatorClaimTest,
  setupTest,
} from "./setup";

describe("AnyStakeVault", () => {
  it("should deploy and setup Vault correctly", async () => {
    const { mastermind } = await setupTest();
    const { AnyStake, Regulator, Vault } = mastermind;

    const owner = await Vault.owner();
    const anystakeAddress = await Vault.anystake();
    const regulatorAddress = await Vault.regulator();
    const distributionRate = await Vault.distributionRate();

    expect(owner).eq(mastermind.address);
    expect(anystakeAddress).eq(AnyStake.address);
    expect(regulatorAddress).eq(Regulator.address);
    expect(distributionRate.toNumber()).eq(700);
  });

  it("should bond rewards", async () => {
    const { mastermind } = await setupTest();
    const { Token, Vault } = mastermind;

    const bondedAmount = ethers.utils.parseEther("1000");
    const bondedBlocks = 1000;

    await Token.approve(Vault.address, ethers.constants.MaxUint256).then((tx) =>
      tx.wait()
    );
    await Vault.addBondedRewards(bondedAmount, bondedBlocks).then((tx) =>
      tx.wait()
    );

    const bondedRewards = await Vault.bondedRewards();
    const bondedRewardsPerBlock = await Vault.bondedRewardsPerBlock();
    const bondedRewardsBlocksRemaining = await Vault.bondedRewardsBlocksRemaining();

    expect(bondedRewards.toString()).eq(bondedAmount.toString());
    expect(bondedRewardsPerBlock.toString()).eq(
      ethers.utils.parseEther("1").toString()
    );
    expect(bondedRewardsBlocksRemaining.toNumber()).eq(bondedBlocks);
  });

  it("should distribute rewards on AnyStake updates", async () => {
    const { mastermind } = await setupAnyStakeClaimTest();
    const { AnyStake, Regulator, Token, Vault } = mastermind;

    await AnyStake.updatePool(0).then((tx) => tx.wait());

    const balance = await Token.balanceOf(Vault.address);
    const bondedRewards = await Vault.bondedRewards();
    const pendingRewards = await Vault.pendingRewards();
    const regulatorBuyback = await Regulator.buybackBalance();
    const regulatorRewards = pendingRewards.mul(3).div(10);

    expect(balance.eq(pendingRewards.add(bondedRewards))).true;
    expect(regulatorRewards.mul(3).div(10).eq(regulatorBuyback)).true;
  });

  it("should distribute rewards on Regulator updates", async () => {
    const { mastermind } = await setupRegulatorClaimTest();
    const { Regulator, Token, Vault } = mastermind;

    await Regulator.updatePool().then((tx) => tx.wait());

    const balance = await Token.balanceOf(Vault.address);
    const bondedRewards = await Vault.bondedRewards();
    const pendingRewards = await Vault.pendingRewards();
    const regulatorBuyback = await Regulator.buybackBalance();
    const regulatorRewards = pendingRewards.mul(3).div(10);

    expect(balance.eq(pendingRewards.add(bondedRewards))).true;
    expect(regulatorRewards.mul(3).div(10).eq(regulatorBuyback)).true;
  });
});
