import { ethers, getNamedAccounts } from "hardhat";
import { AnyStake, AnyStakeRegulator } from "../typechain";

const main = async () => {
  const { mastermind } = await getNamedAccounts();

  const anystake = (await ethers.getContract(
    "AnyStake",
    mastermind
  )) as AnyStake;
  const regulator = (await ethers.getContract(
    "AnyStakeRegulator",
    mastermind
  )) as AnyStakeRegulator;

  await anystake.massUpdatePools().then((tx) => tx.wait());
  await regulator.updatePool().then((tx) => tx.wait());
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
