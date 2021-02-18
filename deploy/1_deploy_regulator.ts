import { DeployFunction } from "hardhat-deploy/types";
import {
  DeFiatGov,
  DeFiatPoints,
} from "@defiat-crypto/core-contracts/typechain";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, gov, points, token } = await getNamedAccounts();

  const result = await deploy("AnyStakeRegulator", {
    from: mastermind,
    log: true,
    args: [uniswap, gov, points, token],
  });

  const Gov = (await ethers.getContract("DeFiatGov", mastermind)) as DeFiatGov;
  const Points = (await ethers.getContract(
    "DeFiatPoints",
    mastermind
  )) as DeFiatPoints;

  if (result.newlyDeployed) {
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
  }
};

export default func;
func.tags = ["Regulator"];
