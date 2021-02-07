import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake, DeFiatGov } from "../typechain";
// import Addresses from "../utils/address";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points } = await getNamedAccounts();

  const result = await deploy("AnyStake", {
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
    console.log("AnyStake Governance successfully configured.");

    // batch add the pools
    // const anystake = await ethers.getContract('AnyStake', deployer) as AnyStake;
    // const tokens = Addresses.mainnet.anystake;

    // await anystake.addPoolBatch()
  }
};

export default func;
