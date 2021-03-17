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

    const balanceBefore = await Token.balanceOf(Vault.address);

    await AnyStake.updatePool(0).then((tx) => tx.wait());

    const balanceAfter = await Token.balanceOf(Vault.address);
    const totalRewards = balanceBefore.sub(balanceAfter);
    const poolInfo = await AnyStake.poolInfo(0);

    // rewards distro'd per pool on update, so must take balance in this test
    const anystakeRewards = (await Token.balanceOf(AnyStake.address)).sub(
      poolInfo.totalStaked
    );
    const regulatorRewards = await Token.balanceOf(Regulator.address);
    const regulatorBuyback = await Regulator.buybackBalance();

    console.log("total", totalRewards.toString());
    console.log("t2", anystakeRewards.add(regulatorRewards).toString());
    console.log("r", regulatorRewards.toString());
    console.log("bb", regulatorBuyback.toString());

    expect(totalRewards.eq(anystakeRewards.add(regulatorRewards))).true;
    expect(totalRewards.mul(7).div(10).eq(anystakeRewards)).true;
    expect(regulatorRewards.mul(3).div(10).eq(regulatorBuyback)).true;
  });

  it("should distribute rewards on Regulator updates", async () => {
    const { mastermind } = await setupClaimTest();
    const { AnyStake, Regulator, Token, Vault } = mastermind;

    const balanceBefore = await Token.balanceOf(Vault.address);

    await Regulator.updatePool().then((tx) => tx.wait());

    // rewards distro'd per pool on update, so must take balance in this test
    const balanceAfter = await Token.balanceOf(Vault.address);
    const totalRewards = balanceBefore.sub(balanceAfter);
    const poolInfo = await AnyStake.poolInfo(0);

    const anystakeRewards = (await Token.balanceOf(AnyStake.address)).sub(
      poolInfo.totalStaked
    );
    const regulatorRewards = await Token.balanceOf(Regulator.address);
    const regulatorBuyback = await Regulator.buybackBalance();

    expect(totalRewards.eq(anystakeRewards.add(regulatorRewards))).true;
    expect(totalRewards.mul(7).div(10).eq(anystakeRewards)).true;
    expect(regulatorRewards.mul(3).div(10).eq(regulatorBuyback)).true;
  });
});
