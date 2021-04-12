import { getNamedAccounts } from "hardhat";
import { getAnyStake, getAnyStakeV2 } from "../utils";

const main = async () => {
  const { mastermind } = await getNamedAccounts();
  const AnyStake = await getAnyStakeV2(mastermind);

  const poolLength = (await AnyStake.poolLength()).toNumber();

  for (let pid = 1; pid < poolLength; pid++) {
    const userInfo = await AnyStake.userInfo(pid, mastermind);
    if (userInfo.amount.gt(0)) {
      await AnyStake.withdraw(pid, userInfo.amount).then((tx) => tx.wait());
    }
  }

  const userInfo = await AnyStake.userInfo(0, mastermind);
  if (userInfo.amount.gt(0)) {
    await AnyStake.withdraw(0, userInfo.amount).then((tx) => tx.wait());
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
