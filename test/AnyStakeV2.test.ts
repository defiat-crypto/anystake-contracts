import { setupV2Tests } from "./setup";
import { expect } from "chai";
import { getAnyStakeV2DeploymentPools } from "../utils/pools";
import { advanceNBlocks } from "../utils/time";
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

    expect(anystakeAddress).eq(AnyStake.address);
    expect(vaultAddress).eq(VaultV2.address);
    expect(actorLevel.toNumber()).eq(2);
    expect(discountRate.toNumber()).eq(100);
  });

  it("AnyStake V2 full deposit and withdrawal test", async () => {
    const { alpha } = await setupV2Tests();
    const { AnyStakeV2, VaultV2, Token, Points } = alpha;

    const pools = await getAnyStakeV2DeploymentPools();

    const vaultRewards = await Token.balanceOf(VaultV2.address);

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

      // CORE charges a 1% fee
      if (pid == 20) {
        expect(stakedBalance.gte(BigNumber.from(info.amount).mul(99).div(100)))
          .true;
      } else {
        expect(stakedBalance.eq(info.amount)).true;
      }

      // expect a minted point
      expect(
        pointsBalanceAfter
          .sub(pointsBalanceBefore)
          .eq(BigNumber.from(10).pow(18))
      ).true;

      await advanceNBlocks(5);
      pid += 1;
    }

    // await AnyStakeV2.updatePool(0).then((tx) => tx.wait());
    await AnyStakeV2.massUpdatePools().then((tx) => tx.wait());

    pid = 0;
    let totalRewards = BigNumber.from(0);
    for (let pool of pools) {
      const tokenBalanceBefore = await Token.balanceOf(alpha.address);

      console.log(pid, "Claiming V2");
      await AnyStakeV2.claim(pid).then((tx) => tx.wait());
      const tokenBalanceAfter = await Token.balanceOf(alpha.address);
      const tokensClaimed = tokenBalanceAfter.sub(tokenBalanceBefore);
      console.log(`Claimed Rewards: ${tokensClaimed.toString()}`);

      totalRewards = totalRewards.add(tokensClaimed);
      await advanceNBlocks(5);
      pid += 1;
    }

    // expect that all rewards should be accounted for here
    const totalAllocPoint = await AnyStakeV2.totalAllocPoint();
    const rewardsPerAllocPoint = await AnyStakeV2.rewardsPerAllocPoint();
    const totalAllocRewards = rewardsPerAllocPoint
      .mul(totalAllocPoint)
      .div(BigNumber.from(10).pow(18));

    console.log(`Total claimed: ${totalRewards.toString()}`);
    console.log(`Total rewards distro'd: ${totalAllocRewards.toString()}`);

    const tokenBalanceBefore = await Token.balanceOf(alpha.address);
    await AnyStakeV2.claimAll().then((tx) => tx.wait());
    const tokenBalanceAfter = await Token.balanceOf(alpha.address);
    totalRewards = totalRewards.add(tokenBalanceAfter.sub(tokenBalanceBefore));

    console.log(`Total claimed (claimAll): ${totalRewards.toString()}`);

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

      totalRewards = totalRewards.add(
        tokenBalanceAfter.sub(tokenBalanceBefore)
      );

      if (pid == 0) {
      } else if (pid < 3) {
        expect(stakedBalanceAfter.sub(stakedBalanceBefore).eq(oldStake)).true;
      } else if (pid != 20) {
        expect(
          stakedBalanceAfter
            .sub(stakedBalanceBefore)
            .gte(oldStake.mul(95).div(100))
        ).true;
      } else {
        expect(
          stakedBalanceAfter
            .sub(stakedBalanceBefore)
            .lte(oldStake.mul(95).div(100))
        ).true;
      }

      await advanceNBlocks(5);
      pid += 1;
    }
  });
});
