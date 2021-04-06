import { DeployFunction } from "hardhat-deploy/types";
import { getGovAt, getPointsAt } from "../utils";

const func: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, gov, points, token } = await getNamedAccounts();

  const result = await deploy("AnyStakeRegulator", {
    from: mastermind,
    log: true,
    args: [uniswap, gov, points, token],
  });

  const Gov = await getGovAt(gov, mastermind);
  const Points = await getPointsAt(points, mastermind);

  if (result.newlyDeployed) {
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
  }
};

export default func;
func.tags = ["Regulator"];
