import { ethers, getNamedAccounts } from "hardhat";
import {
  AnyStake,
  FeeOnTransferToken,
  IERC20,
  VariableDecimalToken,
} from "../typechain";

const main = async () => {
  const { mastermind, tokenLp, pointsLp } = await getNamedAccounts();
  const VarToken = (await ethers.getContract(
    "VariableDecimalToken",
    mastermind
  )) as VariableDecimalToken;
  const FeeToken = (await ethers.getContract(
    "FeeOnTransferToken",
    mastermind
  )) as FeeOnTransferToken;

  const tokens = [tokenLp, pointsLp, VarToken.address, FeeToken.address];

  let pid = 0;
  for (let token of tokens) {
    const Token = (await ethers.getContractAt(
      "IERC20",
      token,
      mastermind
    )) as IERC20;
    const AnyStake = (await ethers.getContract(
      "AnyStake",
      mastermind
    )) as AnyStake;

    const balance = await Token.balanceOf(mastermind);
    await Token.approve(AnyStake.address, balance).then((tx) => tx.wait());
    await AnyStake.deposit(pid, balance).then((tx) => tx.wait());
    pid++;
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
