import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake } from "../typechain";
import { DeFiatPoints } from "@defiat-crypto/core-contracts/typechain";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, gov, points, token } = await getNamedAccounts();

  console.log("Deploying with ", mastermind);

  const result = await deploy("AnyStake", {
    from: mastermind,
    log: true,
    args: [uniswap, gov, points, token],
  });

  if (result.newlyDeployed) {
    // batch add the pools
    const anystake = (await ethers.getContract(
      "AnyStake",
      mastermind
    )) as AnyStake;
    // const tokens = Addresses.mainnet.anystake;
    // await anystake.addPoolBatch()

    const points = (await ethers.getContract(
      "DeFiatPoints",
      mastermind
    )) as DeFiatPoints;

    await points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
  }
};

export default func;
