import { ethers, getNamedAccounts } from "hardhat";
import { AnyStakeRegulator } from "../typechain";

const main = async () => {
  const { mastermind } = await getNamedAccounts();

  const regulator = (await ethers.getContract(
    "AnyStakeRegulator",
    mastermind
  )) as AnyStakeRegulator;

  const userInfo = await regulator.userInfo(mastermind);
  await regulator.withdraw(userInfo.amount).then((tx) => tx.wait());
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
