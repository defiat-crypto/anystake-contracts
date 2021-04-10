import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import {
  getAnyStakeV2,
  getGovAt,
  getPointsAt,
  getRegulator,
  getTokenAt,
  getVault,
} from "../utils";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points, gov } = await getNamedAccounts();
  const anystake = await getAnyStakeV2(mastermind);
  const regulator = await getRegulator(mastermind);
  const Vault = await getVault(mastermind);
  const Gov = await getGovAt(gov, mastermind);
  const Points = await getPointsAt(points, mastermind);
  const Token = await getTokenAt(token, mastermind);

  const result = await deploy("AnyStakeVaultV2", {
    from: mastermind,
    log: true,
    args: [
      Vault.address,
      uniswap,
      gov,
      points,
      token,
      anystake.address,
      regulator.address,
    ],
  });

  if (result.newlyDeployed) {
    // set the Vault as DFT Treasury destination and governor
    // whitelist the Anystake contracts for 0 DFT fees
    await Gov.setFeeDestination(result.address).then((tx) => tx.wait());
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
    console.log("AnyStake Ecosystem now whitelisted for DFT transfers");

    // update the regulator and set inactive first
    await regulator.updatePool().then((tx) => tx.wait());
    await regulator.setActive(false).then((tx) => tx.wait());

    if (network.name === "hardhat") {
      console.log("Transferring Vault fee rewards...");
      await Token.transfer(
        Vault.address,
        ethers.utils.parseEther("100")
      ).then((tx) => tx.wait());
      console.log("Transferred Fee rewards.");

      console.log("Bonding Vault rewards...");
      await Token.approve(
        Vault.address,
        ethers.constants.MaxUint256
      ).then((tx) => tx.wait());
      await Vault.addBondedRewards(
        ethers.utils.parseEther("1000"),
        1
      ).then((tx) => tx.wait());
      console.log("Bonded rewards.");
    }

    // migrate the vault
    await Vault.setMigrator(result.address).then((tx) => tx.wait());
    await Vault.migrate().then((tx) => tx.wait());

    // set regulator vault and re-activate
    await regulator.setVault(result.address).then((tx) => tx.wait());
    await regulator.setActive(true).then((tx) => tx.wait());
    console.log("Regulator Vault Set");

    // initialize anystake v2
    await anystake.initialize(result.address).then((tx) => tx.wait());
    console.log("AnyStake Successfully Initialized.");
  }
};

export default func;
func.tags = ["VaultV2"];
