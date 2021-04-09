import { getContractAt } from "hardhat-deploy-ethers/dist/src/helpers";
import { DeployFunction } from "hardhat-deploy/types";
import { getGovAt, getPointsAt, getRegulator, getRegulatorAt } from "../utils";

const func: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  // const { deploy } = deployments;
  // const { mastermind, uniswap, gov, points, token } = await getNamedAccounts();
  // const Regulator = await getRegulator(mastermind);
  // const Gov = await getGovAt(gov, mastermind);
  // const Points = await getPointsAt(points, mastermind);
  // const result = await deploy("AnyStakeRegulatorV2", {
  //   from: mastermind,
  //   log: true,
  //   args: [Regulator.address, uniswap, gov, points, token],
  // });
  // const RegulatorV2 = await getRegulatorAt(result.address, mastermind);
  // if (result.newlyDeployed) {
  //   await Gov.setActorLevel(RegulatorV2.address, 2).then((tx) => tx.wait());
  //   await Points.overrideDiscount(RegulatorV2.address, 100).then((tx) =>
  //     tx.wait()
  //   );
  // }
};

export default func;
func.tags = ["RegulatorV2"];
