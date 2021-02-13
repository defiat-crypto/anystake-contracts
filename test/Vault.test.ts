import { ethers, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { AnyStake, AnyStakeRegulator, AnyStakeVault } from "../typechain";
import {
  DeFiatGov,
  DeFiatPoints,
  DeFiatToken,
} from "@defiat-crypto/core-contracts/typechain";
import { parseEther } from "ethers/lib/utils";
import { setupStakingTest, setupTest } from "./setup";

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

  it("should distribute rewards on updates", async () => {
    const { mastermind } = await setupStakingTest();
    const { AnyStake, Regulator, Token, Vault } = mastermind;

    await Token.transfer(
      Vault.address,
      ethers.utils.parseEther("1000")
    ).then((tx) => tx.wait());

    await AnyStake.massUpdatePools().then((tx) => tx.wait());

    await Token.transfer(
      Vault.address,
      ethers.utils.parseEther("1000")
    ).then((tx) => tx.wait());

    await Regulator.updatePool().then((tx) => tx.wait());

    const anystakeRewards = await AnyStake.totalPendingRewards();
    const regulatorRewards = await Regulator.pendingRewards();
    // const regulatorStockpile = await Regulator.tokenStockpile();

    expect(anystakeRewards.toString()).eq(
      ethers.utils.parseEther("1400").toString()
    );
    expect(regulatorRewards.toString()).eq(
      ethers.utils.parseEther("600").toString()
    );
  });
});
