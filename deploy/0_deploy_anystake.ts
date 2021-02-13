import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake } from "../typechain";
import {
  DeFiatGov,
  DeFiatPoints,
} from "@defiat-crypto/core-contracts/typechain";
import { any } from "hardhat/internal/core/params/argumentTypes";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const {
    core,
    coreLp,
    gov,
    mastermind,
    points,
    pointsLp,
    token,
    tokenLp,
    uniswap,
    usdc,
    usdcLp,
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
    const gov = (await ethers.getContract(
      "DeFiatGov",
      mastermind
    )) as DeFiatGov;
    const points = (await ethers.getContract(
      "DeFiatPoints",
      mastermind
    )) as DeFiatPoints;

    await gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await points.overrideDiscount(result.address, 100).then((tx) => tx.wait());

    if (!network.live) {
      // await anystake
      //   .addPoolBatch(
      //     [tokenLp, pointsLp, usdc, core],
      //     ["0x", "0x", usdcLp, coreLp],
      //     [500, 500, 100, 100]
      //   )
      //   .then((tx) => tx.wait());
    }
  }
};

export default func;
func.tags = ["AnyStake"];
