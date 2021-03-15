import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake, AnyStakeRegulator } from "../typechain";
import {
  DeFiatGov,
  DeFiatPoints,
} from "@defiat-crypto/core-contracts/typechain";
import { getGovAt, getPointsAt } from "../utils";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points, gov } = await getNamedAccounts();
  const anystake = (await ethers.getContract(
    "AnyStake",
    mastermind
  )) as AnyStake;
  const regulator = (await ethers.getContract(
    "AnyStakeRegulator",
    mastermind
  )) as AnyStakeRegulator;

  const result = await deploy("AnyStakeVault", {
    from: mastermind,
    log: true,
    args: [uniswap, gov, points, token, anystake.address, regulator.address],
  });

  const Gov = await getGovAt(gov, mastermind);
  const Points = await getPointsAt(points, mastermind);

  if (result.newlyDeployed) {
    // set the Vault as DFT Treasury destination and governor
    // whitelist the Anystake contracts for 0 DFT fees
    await Gov.setFeeDestination(result.address).then((tx) => tx.wait());
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
    console.log("AnyStake Ecosystem now whitelisted for DFT transfers");
  }

  // initialize the other contracts now
  const anystakeInit = await anystake.initialized();
  const regulatorInit = await regulator.initialized();

  if (!anystakeInit) {
    await anystake.initialize(result.address).then((tx) => tx.wait());
  } else {
    await anystake.setVault(result.address).then((tx) => tx.wait());
  }
  console.log("AnyStake Successfully Initialized.");

  if (!regulatorInit) {
    await regulator.initialize(result.address).then((tx) => tx.wait());
  } else {
    await regulator.setVault(result.address).then((tx) => tx.wait());
  }
  console.log("Regulator Successfully Initialized");
};

export default func;
func.tags = ["Vault"];
