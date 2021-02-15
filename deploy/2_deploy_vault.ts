import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake, AnyStakeRegulator, AnyStakeVault } from "../typechain";
import {
  DeFiatGov,
  DeFiatPoints,
  DeFiatToken,
} from "@defiat-crypto/core-contracts/typechain";

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

  if (result.newlyDeployed) {
    const governance = (await ethers.getContract(
      "DeFiatGov",
      mastermind
    )) as DeFiatGov;
    const points = (await ethers.getContract(
      "DeFiatPoints",
      mastermind
    )) as DeFiatPoints;

    const vault = (await ethers.getContract(
      "AnyStakeVault",
      mastermind
    )) as AnyStakeVault;

    // set the Vault as DFT Treasury destination and governor
    // whitelist the Anystake contracts for 0 DFT fees
    await governance.setFeeDestination(result.address).then((tx) => tx.wait());
    await governance.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
    console.log("AnyStake Ecosystem now whitelisted for DFT transfers");

    // initialize the other contracts now
    await anystake.initialize(result.address).then((tx) => tx.wait());
    console.log("AnyStake Successfully Initialized.");

    await regulator.initialize(result.address).then((tx) => tx.wait());
    console.log("Regulator Successfully Initialized");
  }
};

export default func;
func.tags = ["Vault"];
