import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake } from "../typechain";
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
  const {
    wbtc,
    wbtcLp,
    gov,
    mastermind,
    points,
    pointsLp,
    token,
    tokenLp,
    uniswap,
    usdc,
    usdcLp,
    zero,
  } = await getNamedAccounts();

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
    const governance = (await ethers.getContract(
      "DeFiatGov",
      mastermind
    )) as DeFiatGov;
    const Points = (await ethers.getContract(
      "DeFiatPoints",
      mastermind
    )) as DeFiatPoints;

    await governance.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());

    if (!network.live) {
      await anystake
        .addPoolBatch(
          [tokenLp, pointsLp, usdc, wbtc],
          [zero, zero, usdcLp, wbtcLp],
          [500, 500, 100, 100],
          false
        )
        .then((tx) => tx.wait());
    }
  }
};

export default func;
func.tags = ["AnyStake"];
