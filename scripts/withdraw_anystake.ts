import { ethers, getNamedAccounts } from "hardhat";
import {
  AnyStake,
  FeeOnTransferToken,
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
    const AnyStake = (await ethers.getContract(
      "AnyStake",
      mastermind
    )) as AnyStake;

    const userInfo = await AnyStake.userInfo(pid, mastermind);
    await AnyStake.withdraw(pid, userInfo.amount).then((tx) => tx.wait());
    pid++;
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
