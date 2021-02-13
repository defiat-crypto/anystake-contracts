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

describe("AnyStakeRegulator", () => {
  it("should deploy and setup Regulator correctly", async () => {
    const { mastermind } = await setupTest();
    const { Regulator, Vault } = mastermind;

    const vaultAddress = await Regulator.vault();

    expect(vaultAddress).to.equal(Vault.address);
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
  });

  it("should accept withdrawals and buy Points on Uniswap", async () => {
    const { alpha } = await setupStakingTest();

    // simulate when DFTP price is below the peg
  });

  it("should accept withdrawals and buy DeFiat on Uniswap", async () => {
    const { alpha } = await setupStakingTest();

    // simulate when DFTP price is above the peg
  });

  it("should claim rewards", async () => {
    const { alpha } = await setupStakingTest();
    const { Regulator, Token } = alpha;

    await Regulator.claim();

    const balance = await Token.balanceOf(alpha.address);
    const stake = await Regulator.userInfo(alpha.address);

    expect(balance.gt(0));
  });

  it("should reject claims when no staked balance", async () => {
    const { beta } = await setupTest();
    const { Regulator } = beta;

    expect(Regulator.claim()).to.be.reverted;
  });
});
