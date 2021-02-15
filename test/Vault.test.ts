import { ethers } from "hardhat";
import { expect } from "chai";
import { setupClaimTest, setupTest } from "./setup";

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
    const { mastermind } = await setupClaimTest();
    const { AnyStake, Regulator, Token, Vault } = mastermind;

    await Regulator.updatePool().then((tx) => tx.wait());

    // rewards distro'd per pool on update, so must take balance in this test
    const anystakeRewards = await Token.balanceOf(AnyStake.address);
    const regulatorRewards = await Regulator.pendingRewards();
    const regulatorBuyback = await Regulator.buybackBalance();

    expect(anystakeRewards.toString()).eq(
      ethers.utils.parseEther("700").toString()
    );
    expect(regulatorRewards.toString()).eq(
      ethers.utils.parseEther("210").toString()
    );
    expect(regulatorBuyback.toString()).eq(
      ethers.utils.parseEther("90").toString()
    );
  });

  it("should distribute rewards on Regulator updates", async () => {
    const { mastermind } = await setupClaimTest();
    const { AnyStake, Regulator, Token, Vault } = mastermind;

    await AnyStake.massUpdatePools().then((tx) => tx.wait());
    await Regulator.updatePool().then((tx) => tx.wait());

    // rewards distro'd per pool on update, so must take balance in this test
    const anystakeRewards = await Token.balanceOf(AnyStake.address);
    const regulatorRewards = await Regulator.pendingRewards();
    const regulatorBuyback = await Regulator.buybackBalance();

    expect(anystakeRewards.toString()).eq(
      ethers.utils.parseEther("700").toString()
    );
    expect(regulatorRewards.toString()).eq(
      ethers.utils.parseEther("210").toString()
    );
    expect(regulatorBuyback.toString()).eq(
      ethers.utils.parseEther("90").toString()
    );
  });
});
