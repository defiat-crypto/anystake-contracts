import { DeployFunction } from "hardhat-deploy/types";
import {
  getAnyStakeV2,
  getGovAt,
  getPointsAt,
  getRegulator,
  getVault,
} from "../utils";

const func: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points, gov } = await getNamedAccounts();
  const anystake = await getAnyStakeV2(mastermind);
  const regulator = await getRegulator(mastermind);
  const vault = await getVault(mastermind);

  const result = await deploy("AnyStakeVaultV2", {
    from: mastermind,
    log: true,
    args: [
      vault.address,
      uniswap,
      gov,
      points,
      token,
      anystake.address,
      regulator.address,
    ],
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

  // update the regulator and set inactive first
  await regulator.updatePool().then((tx) => tx.wait());
  await regulator.setActive(false).then((tx) => tx.wait());

  // migrate the vault
  await vault.setMigrator(result.address).then((tx) => tx.wait());
  await vault.migrate().then((tx) => tx.wait());

  // set regulator vault and re-activate
  await regulator.setVault(result.address).then((tx) => tx.wait());
  await regulator.setActive(true).then((tx) => tx.wait());
  console.log("Regulator Vault Set");

  // initialize anystake v2
  await anystake.initialize(result.address).then((tx) => tx.wait());
  console.log("AnyStake Successfully Initialized.");
};

export default func;
func.tags = ["VaultV2"];
