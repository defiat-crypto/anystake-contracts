import { setupV2Tests } from "./setup";
import { expect } from "chai";
import { getAnyStakeDeploymentPools } from "../utils/pools";
import { advanceNBlocks } from "../utils/time";
import { setupAnyStakeMigration } from "../utils/migrate";
import { BigNumber } from "@ethersproject/bignumber";
import { approveToken, getERC20At } from "../utils";

describe("AnyStakeV2", () => {
  it("should deploy and setup AnyStakeV2 correctly", async () => {
    const { mastermind } = await setupV2Tests();
    const { AnyStakeV2, AnyStake, Gov, Points, VaultV2 } = mastermind;

    const anystakeAddress = await AnyStakeV2.anystake();
    const vaultAddress = await AnyStakeV2.vault();
    const actorLevel = await Gov.viewActorLevelOf(AnyStakeV2.address);
    const discountRate = await Points.viewDiscountOf(AnyStakeV2.address);
    const eligiblePools = await AnyStake.totalEligiblePools();

    expect(anystakeAddress).eq(AnyStake.address);
    expect(vaultAddress).eq(VaultV2.address);
    expect(actorLevel.toNumber()).eq(2);
    expect(discountRate.toNumber()).eq(100);
    expect(eligiblePools.toNumber()).eq(0);
  });

  it("should migrate from AnyStake to AnyStakeV2", async () => {
    const { alpha, mastermind } = await setupV2Tests();
    const { Vault } = mastermind;
    const { AnyStakeV2, AnyStake, Token, Points } = alpha;

    const pools = await getAnyStakeDeploymentPools();

    let pid = 0;
    for (let pool of pools) {
      const stakedToken = await getERC20At(pool.token, alpha.address);
      const stakedBalance = await stakedToken.balanceOf(alpha.address);
      const pointsBalanceBefore = await Points.balanceOf(alpha.address);

      console.log(pid, "Depositing V2", stakedBalance.toString());
      await approveToken(pool.token, alpha.address, AnyStakeV2.address);
      await AnyStakeV2.deposit(pid, stakedBalance).then((tx) => tx.wait());

      const pointsBalanceAfter = await Points.balanceOf(alpha.address);
      const info = await AnyStakeV2.userInfo(pid, alpha.address);

      if (pid != 20) {
        expect(stakedBalance.eq(info.amount)).true;
      } else {
        expect(stakedBalance.gte(info.amount)).true;
      }

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
      const stakedToken = await getERC20At(pool.token, alpha.address);
      const stakedBalanceBefore = await stakedToken.balanceOf(alpha.address);
      const tokenBalanceBefore = await Token.balanceOf(alpha.address);

      const oldStake = (await AnyStakeV2.userInfo(pid, alpha.address)).amount;

      if (pid != 0) {
        console.log(pid, "Withdrawing V2", oldStake.toString());
        await AnyStakeV2.withdraw(pid, oldStake).then((tx) => tx.wait());
      }

      const stakedBalanceAfter = await stakedToken.balanceOf(alpha.address);
      const tokenBalanceAfter = await Token.balanceOf(alpha.address);

      if (pid == 0) {
      } else if (pid < 3) {
        expect(stakedBalanceAfter.sub(stakedBalanceBefore).eq(oldStake)).true;
        expect(tokenBalanceAfter.gt(tokenBalanceBefore)).true;
      } else if (pid != 20) {
        expect(
          stakedBalanceAfter
            .sub(stakedBalanceBefore)
            .gte(oldStake.mul(95).div(100))
        ).true;
        expect(tokenBalanceAfter.gt(tokenBalanceBefore)).true;
      } else {
        expect(
          stakedBalanceAfter
            .sub(stakedBalanceBefore)
            .lte(oldStake.mul(95).div(100))
        ).true;
        expect(tokenBalanceAfter.gt(tokenBalanceBefore)).true;
      }

      await advanceNBlocks(5);
      pid += 1;
    }
  });
});
