import { getNamedAccounts } from "hardhat";
import {
  getAnyStake,
  getAnyStakeV2,
  getRegulator,
  getRegulatorV2,
  getVault,
} from "./account";

export const setupAnyStakeMigration = async () => {
  const { mastermind } = await getNamedAccounts();

  const AnyStake = await getAnyStake(mastermind);
  // const AnyStakeV2 = await getAnyStakeV2(mastermind);
  const Vault = await getVault(mastermind);
  const length = await AnyStake.poolLength();

  for (let pid = 0; pid < length.toNumber(); pid++) {
    console.log(pid, "Migration Setup");
    await AnyStake.updatePool(pid).then((tx) => tx.wait());
    await AnyStake.setPoolAllocPoints(pid, 0).then((tx) => tx.wait());
    const vipAmount = (await AnyStake.poolInfo(pid)).vipAmount;
    if (vipAmount.gt(0)) {
      await AnyStake.setPoolVipAmount(pid, 0).then((tx) => tx.wait());
    }

    // if (pid > 2) {
    //   await AnyStake.setPoolChargeFee(pid, 0).then((tx) => tx.wait());
    // }
  }
  // await AnyStake.setMigrator(AnyStakeV2.address).then((tx) => tx.wait());

  // await Vault.setAnyStake(AnyStakeV2.address).then((tx) => tx.wait());
  // await AnyStakeV2.initialize(Vault.address).then((tx) => tx.wait());
};

export const setupRegulatorMigration = async () => {
  const { mastermind } = await getNamedAccounts();

  const Regulator = await getRegulator(mastermind);
  const RegulatorV2 = await getRegulatorV2(mastermind);
  const Vault = await getVault(mastermind);

  await Regulator.updatePool().then((tx) => tx.wait());
  await Regulator.setActive(false).then((tx) => tx.wait());
  // await Regulator.setMigrator(RegulatorV2.address).then((tx) => tx.wait());

  await Vault.setAnyStake(RegulatorV2.address).then((tx) => tx.wait());
  await RegulatorV2.initialize(Vault.address).then((tx) => tx.wait());
};
