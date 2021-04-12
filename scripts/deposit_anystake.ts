import { ethers, getNamedAccounts } from "hardhat";
import {
  AnyStake,
  FeeOnTransferToken,
  IERC20,
  VariableDecimalToken,
} from "../typechain";
import { getAnyStakeV2, getERC20At } from "../utils";

const main = async () => {
  const {
    mastermind,
    token,
    tokenLp,
    pointsLp,
    feeToken,
    varToken,
  } = await getNamedAccounts();

  const tokens = [token, tokenLp, pointsLp, varToken, feeToken];

  let pid = 0;
  for (let token of tokens) {
    const Token = await getERC20At(token, mastermind);
    const AnyStake = await getAnyStakeV2(mastermind);

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
