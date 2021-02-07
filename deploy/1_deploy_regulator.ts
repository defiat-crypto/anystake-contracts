import { DeployFunction } from "hardhat-deploy/types";
import { DeFiatGov } from "../typechain";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points } = await getNamedAccounts();

  const result = await deploy("AnyStakeRegulator", {
    from: mastermind,
    log: true,
    args: [uniswap, token, points],
  });

  if (result.newlyDeployed) {
    const governance = (await ethers.getContract(
      "DeFiatGov",
      mastermind
    )) as DeFiatGov;

    await governance.setActorLevel(result.address, 2).then((tx) => tx.wait());
    console.log("Regulator Governance successfully configured.");

    // whitelist the Regulator contract for DFT fees
  }
};

export default func;
