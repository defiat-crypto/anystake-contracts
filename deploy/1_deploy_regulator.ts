import { DeployFunction } from "hardhat-deploy/types";
import { DeFiatPoints } from "@defiat-crypto/core-contracts/typechain";

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

  if (result.newlyDeployed) {
    // whitelist the Regulator contract for DFT fees

    const points = (await ethers.getContract(
      "DeFiatPoints",
      mastermind
    )) as DeFiatPoints;

    await points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
  }
};

export default func;
