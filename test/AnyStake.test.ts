import { setupStakingTest, setupTest } from "./setup";
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { getAnyStakeDeploymentPools } from "../utils/pools";
import { approveToken, getERC20At } from "../utils";
import { BigNumber } from "@ethersproject/bignumber";
import { advanceNBlocks } from "../utils/time";

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

  it("should reject claims when no staked balance", async () => {
    const { beta } = await setupTest();
    const { AnyStake } = beta;

    expect(AnyStake.claim(0)).to.be.reverted;
  });

  it("should reject withdraws when invalid", async () => {
    const { beta } = await setupTest();
    const { AnyStake } = beta;

    expect(AnyStake.withdraw(0, "0")).to.be.reverted;
  });

  it("full deposit/withdraw deployment test for AnyStake", async () => {
    const { alpha } = await setupStakingTest();
    const { AnyStake, Token, Vault, Points, Regulator } = alpha;
    const { tokenLp } = await getNamedAccounts();
    const pools = await getAnyStakeDeploymentPools();

    let pid = 0;
    for (let pool of pools) {
      const pointsBalanceBefore = await Points.balanceOf(alpha.address);

      const Token = await getERC20At(pool.token, alpha.address);
      await approveToken(pool.token, alpha.address, AnyStake.address);
      const balance = await Token.balanceOf(alpha.address);

      console.log(pid, "Staking", balance.toString());
      await AnyStake.deposit(pid, balance).then((tx) => tx.wait());

      const pointsBalanceAfter = await Points.balanceOf(alpha.address);
      const info = await AnyStake.userInfo(pid, alpha.address);

      expect(info.amount.lte(balance)).true;
      expect(
        pointsBalanceAfter
          .sub(pointsBalanceBefore)
          .eq(BigNumber.from(10).pow(18))
      ).true;

      await advanceNBlocks(5);
      pid += 1;
    }

    pid = 0;
    for (let pool of pools) {
      const subjectToken = await getERC20At(pool.token, alpha.address);
      const info = await AnyStake.userInfo(pid, alpha.address);
      const price = await Vault.getTokenPrice(Token.address, tokenLp);
      const rewards = await Token.balanceOf(Vault.address);
      const balance = await subjectToken.balanceOf(alpha.address);

      if (pid != 0) {
        console.log(pid, "Unstaking", info.amount.toString());
        await AnyStake.withdraw(pid, info.amount).then((tx) => tx.wait());
      }

      const infoAfter = await AnyStake.userInfo(pid, alpha.address);
      const priceAfter = await Vault.getTokenPrice(Token.address, tokenLp);
      const rewardsAfter = await Token.balanceOf(Vault.address);
      const balanceAfter = await subjectToken.balanceOf(alpha.address);

      if (pid != 0) {
        expect(infoAfter.amount.toNumber()).eq(0);

        if (pid < 3) {
          expect(balanceAfter.sub(balance).gte(info.amount)).true;
        } else {
          expect(priceAfter.gt(price)).true;
          expect(rewardsAfter.gt(rewards)).true;
          // expect(balanceAfter.sub(balance).gte(info.amount.mul(95).div(100)))
          // .true;
        }
      }

      pid += 1;
    }
  });
});
