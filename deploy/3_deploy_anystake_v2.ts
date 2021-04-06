import { DeployFunction } from "hardhat-deploy/types";
import { getAnyStake, getAnyStakeV2At, getGovAt, getPointsAt } from "../utils";
import { getAnyStakeV2DeploymentPools } from "../utils/pools";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const {
    gov,
    mastermind,
    points,
    pointsLp,
    token,
    tokenLp,
    uniswap,
    zero,
    feeToken,
    feeTokenLp,
    varToken,
    varTokenLp,
  } = await getNamedAccounts();

  const AnyStake = await getAnyStake(mastermind);
  const Gov = await getGovAt(gov, mastermind);
  const Points = await getPointsAt(points, mastermind);

  const result = await deploy("AnyStakeV2", {
    from: mastermind,
    log: true,
    args: [AnyStake.address, uniswap, gov, points, token],
  });
  const AnyStakeV2 = await getAnyStakeV2At(result.address, mastermind);

  if (result.newlyDeployed) {
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
    await Points.setWhitelisted(result.address, true).then((tx) => tx.wait());

    if (!network.live || network.name == "mainnet") {
      const pools = await getAnyStakeV2DeploymentPools();
      const tokens = pools.map((pool) => pool.token);
      const lpTokens = pools.map((pool) => pool.lpToken);
      const allocPoints = pools.map((pool) => pool.allocPoint);
      const vipAmount = pools.map((pool) => pool.vipAmount);
      const feeAmount = pools.map((pool) => pool.feeAmount);

      await AnyStakeV2.addPoolBatch(
        tokens,
        lpTokens,
        allocPoints,
        vipAmount,
        feeAmount
      ).then((tx) => tx.wait());
    } else if (network.name == "rinkeby") {
      if (result.newlyDeployed) {
        await AnyStakeV2.addPoolBatch(
          [token, tokenLp, pointsLp, varToken, feeToken],
          [tokenLp, zero, zero, varTokenLp, feeTokenLp],
          [100, 500, 500, 100, 100],
          [0, 0, 0, ethers.utils.parseEther("10"), 0],
          [0, 0, 0, 50, 50]
        ).then((tx) => tx.wait());
      }
    }
  }
};

export default func;
func.tags = ["AnyStakeV2"];
