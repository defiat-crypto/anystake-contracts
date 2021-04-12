import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import {
  getAnyStake,
  getAnyStakeV2,
  getGovAt,
  getPointsAt,
  getRegulator,
  getTokenAt,
  getVault,
  getVaultV2At,
} from "../utils";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
}) => {
  const { deploy } = deployments;
  const { mastermind, uniswap, token, points, gov } = await getNamedAccounts();
  const AnyStake = await getAnyStake(mastermind);
  const AnyStakeV2 = await getAnyStakeV2(mastermind);
  const Regulator = await getRegulator(mastermind);
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
      AnyStake.address,
      Regulator.address,
    ],
  });

  const VaultV2 = await getVaultV2At(result.address, mastermind);

  if (result.newlyDeployed) {
    // set the Vault as DFT Treasury destination and governor
    // whitelist the Anystake contracts for 0 DFT fees
    await Gov.setFeeDestination(VaultV2.address).then((tx) => tx.wait());
    await Gov.setActorLevel(VaultV2.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(VaultV2.address, 100).then((tx) => tx.wait());
    console.log("AnyStake Ecosystem now whitelisted for DFT transfers");

    // update the regulator and set inactive first
    await Regulator.updatePool().then((tx) => tx.wait());
    await Regulator.setActive(false).then((tx) => tx.wait());

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
        200
      ).then((tx) => tx.wait());
      console.log("Bonded rewards.");
    }

    // migrate the vault
    await Vault.setMigrator(VaultV2.address).then((tx) => tx.wait());
    await Vault.migrate().then((tx) => tx.wait());

    // set regulator vault and re-activate
    await Regulator.setVault(VaultV2.address).then((tx) => tx.wait());
    await Regulator.setActive(true).then((tx) => tx.wait());
    console.log("Regulator Vault Set");

    // update VaultV2 Anystake and initialize anystake v2
    await VaultV2.setAnyStake(AnyStakeV2.address).then((tx) => tx.wait());
    await AnyStakeV2.setVault(VaultV2.address).then((tx) => tx.wait());
    console.log("AnyStake Successfully Initialized.");
  }
};

export default func;
func.tags = ["VaultV2"];
