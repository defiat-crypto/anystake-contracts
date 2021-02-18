import { ethers, getNamedAccounts } from "hardhat";
import { AnyStakeRegulator, IERC20 } from "../typechain";

const main = async () => {
  const { mastermind, points } = await getNamedAccounts();

  const Token = (await ethers.getContractAt(
    "IERC20",
    points,
    mastermind
  )) as IERC20;
  const Regulator = (await ethers.getContract(
    "AnyStakeRegulator",
    mastermind
  )) as AnyStakeRegulator;

  const balance = await Token.balanceOf(mastermind);
  await Token.approve(Regulator.address, balance).then((tx) => tx.wait());
  await Regulator.deposit(balance).then((tx) => tx.wait());
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
