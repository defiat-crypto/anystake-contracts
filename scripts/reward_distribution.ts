import { BigNumber } from "@ethersproject/bignumber";
import { getNamedAccounts } from "hardhat";
import { getAnyStake, getAnyStakeV2, getVault } from "../utils";
import fs from "fs";
import path from "path";
import { Event } from "@ethersproject/contracts";

const DECIMALS = BigNumber.from(10).pow(18);
const TOTAL_DISTRO = BigNumber.from(3680).mul(DECIMALS);
const GAS_SUBSIDY = BigNumber.from(3000).mul(DECIMALS);
const TOTAL_ALLOC_POINTS = 6200;
const START_BLOCK = 12175584;
const END_BLOCK = 12255351;
const WRITE_FILE = true;

const ALLOC_POINTS: any = {
  "0": 200,
  "1": 1500,
  "2": 1500,
  "3": 400,
  "7": 400,
  "12": 400,
  "13": 400,
};

interface AnyStakeEvent {
  user: string;
  pid: number;
  amount: string;
}

const getDeposits = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStake = await getAnyStake(deployer);

  // find all deposit events
  const filter = AnyStake.filters.Deposit(null, null, null);
  const events = await AnyStake.queryFilter(filter, START_BLOCK);

  // sort into a list
  const deposits = await aggregateEvents(events);
  console.log(`Total Deposits: ${deposits.length}`);

  // aggregate the list by address, find deposits per user
  const users = await aggregateByUser(deposits);
  console.log(`Total Unique Users: ${Object.keys(users).length}`);
  console.log(users);

  // aggregate by pool for output
  const pools = await aggregateByPool(deposits);

  // format into CSV
  if (WRITE_FILE) {
    await writeToFile(pools, "../files/deposits.csv");
  }

  return users;
};

const getDepositsV2 = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStakeV2 = await getAnyStakeV2(deployer);

  // find all deposit events
  const filter = AnyStakeV2.filters.Deposit(null, null, null);
  const events = await AnyStakeV2.queryFilter(filter, 0, END_BLOCK);

  // sort into a list
  const deposits = await aggregateEvents(events);
  console.log(`Total Deposits: ${deposits.length}`);

  // aggregate the list by address, find deposits per user
  const users = await aggregateByUser(deposits);
  console.log(`Total Unique Users: ${Object.keys(users).length}`);
  console.log(users);

  // aggregate by pool for output
  const pools = await aggregateByPool(deposits);

  // format into CSV
  if (WRITE_FILE) {
    await writeToFile(pools, "../files/deposits-v2.csv");
  }

  return users;
};

const getClaims = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStake = await getAnyStake(deployer);

  // find all deposit events
  const filter = AnyStake.filters.Claim(null, null, null);
  const events = await AnyStake.queryFilter(filter, START_BLOCK, END_BLOCK);

  const claims = await aggregateEvents(events);
  const totalClaimed = claims.reduce(
    (sum: BigNumber, next: AnyStakeEvent) =>
      BigNumber.from(sum).add(next.amount),
    BigNumber.from(0)
  );
  // .mul(BigNumber.from(10).pow(18))
  // .div(BigNumber.from(10).pow(18))
  console.log(`Total Claims: ${claims.length}`);
  console.log(`Total DFT Claimed: ${totalClaimed.toString()}`);

  // const users = await aggregateByUser(claims);
  const pools = await aggregateByPool(claims);

  // format into CSV
  if (WRITE_FILE) {
    await writeToFile(pools, "../files/claims.csv");
  }

  return totalClaimed;
};

const getWithdraws = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStake = await getAnyStake(deployer);

  // find all deposit events
  const filter = AnyStake.filters.Withdraw(null, null, null);
  const events = await AnyStake.queryFilter(filter, START_BLOCK, END_BLOCK);

  const withdraws = await aggregateEvents(events);
  console.log(`Total Withdraws: ${withdraws.length}`);

  const pools = await aggregateByPool(withdraws);

  if (WRITE_FILE) {
    await writeToFile(pools, "../files/withdraws.csv");
  }
};

const getRewardsDistributed = async () => {
  const { deployer } = await getNamedAccounts();
  const Vault = await getVault(deployer);

  // get total DFT rewards for each contract
  const filter = Vault.filters.RewardsDistributed(null, null, null);
  const events = await Vault.queryFilter(filter, 12175584);

  const anystakeAmount = events.reduce(
    (sum: BigNumber, next: Event) => sum.add(next.args![1]),
    BigNumber.from(0)
  );
  const regulatorAmount = events.reduce(
    (sum: BigNumber, next: Event) => sum.add(next.args![2]),
    BigNumber.from(0)
  );

  console.log(`AnyStake Amount: ${anystakeAmount.toString()}`);
  console.log(`Regulator Amount: ${regulatorAmount.toString()}`);

  return anystakeAmount;
};

const aggregateByUser = async (deposits: AnyStakeEvent[]) => {
  const aggregated: any = {};

  deposits.forEach((deposit) => {
    const { user, pid, amount } = deposit;
    if (!aggregated[deposit.user]) {
      aggregated[user] = {};
      aggregated[user].deposits = 1;
      aggregated[user][pid] = amount;
    } else if (!aggregated[user][pid]) {
      aggregated[user].deposits += 1;
      aggregated[user][pid] = amount;
    } else {
      aggregated[user].deposits += 1;
      aggregated[user][pid] = BigNumber.from(aggregated[user][pid])
        .add(amount)
        .toString();
    }
  });

  return aggregated;
};

const aggregateEvents = async (events: Event[]) => {
  return events.map(
    (event) =>
      ({
        user: event.args![0],
        pid: +event.args![1],
        amount: BigNumber.from(event.args![2]).toString(),
      } as AnyStakeEvent)
  );
};

const aggregateByPool = async (deposits: AnyStakeEvent[]) => {
  let pools: any = {};

  deposits.forEach((deposit) => {
    const { user, pid, amount } = deposit;
    if (!pools[pid]) {
      pools[pid] = {};
      pools[pid][user] = amount;
    } else if (!pools[pid][user]) {
      pools[pid][user] = amount;
    } else {
      pools[pid][user] = BigNumber.from(pools[pid][user])
        .add(amount)
        .toString();
    }
  });

  return pools;
};

const writeToFile = async (pools: any, file: string) => {
  const output = ["User,PID,Amount"];
  Object.keys(pools).forEach((pid) => {
    Object.keys(pools[pid]).forEach((user) => {
      output.push(`${user},${pid},${pools[pid][user]}`);
    });
  });

  // console.log(output);

  // write to file
  fs.writeFileSync(path.resolve(__dirname, file), output.join("\n"));
};

const findEligibleUsers = async (deposits: any, depositsV2: any) => {
  // find the eligible users
  const users: any = {};
  Object.keys(deposits).forEach((user: string) => {
    if (depositsV2[user]) {
      users[user] = deposits[user];
    }
  });
  console.log(users);
  console.log(`Total Eligible Users: ${Object.keys(users).length}`);

  return users;
};

const findTotalEligibleDeposits = async (users: any) => {
  // sum the total eligible pool deposits
  const totals: any = {};
  Object.keys(users).forEach((user: string) => {
    Object.keys(users[user]).forEach((key: string) => {
      if (!totals[key]) {
        totals[key] = users[user][key];
      } else {
        totals[key] = BigNumber.from(totals[key])
          .add(users[user][key])
          .toString();
      }
    });
  });

  console.log(totals);
  return totals;
};

const findEligibleUserShares = async (users: any, totals: any) => {
  const userShares: any = {};
  Object.keys(users).forEach((user: string) => {
    userShares[user] = BigNumber.from(0);
    Object.keys(users[user]).forEach((key: string) => {
      if (key === "deposits") {
        const subsidy = GAS_SUBSIDY.mul(users[user][key]).div(totals[key]);
        userShares[user] = userShares[user].add(subsidy);
      } else {
        const alloc = ALLOC_POINTS[key] ? ALLOC_POINTS[key] : 100;
        const poolShares = TOTAL_DISTRO.mul(alloc).div(TOTAL_ALLOC_POINTS);
        const userRatio = BigNumber.from(users[user][key])
          .mul(DECIMALS)
          .div(totals[key]);
        const userAmount = userRatio.mul(poolShares).div(DECIMALS);
        userShares[user] = userShares[user].add(userAmount);
      }
    });
    userShares[user] = userShares[user];
  });
  console.log(userShares);

  if (WRITE_FILE) {
    const output = ["User,Amount"];
    Object.keys(userShares).forEach((user) => {
      output.push(`${user},${userShares[user]}`);
    });
    fs.writeFileSync(
      path.resolve(__dirname, "../files/distribution-subsidy.csv"),
      output.join("\n")
    );
  }
  return userShares;
};

const findPoolAllocation = async () => {
  // Claimed: 505.597785551601377549 DFT Claimed from AnyStake V1, 496 events
  const claimed = await getClaims();
  // Allocated: 4186.060566788635449804 DFT Allocated to AnyStakeV1
  const allocated = await getRewardsDistributed();
  // Remaining: Allocated - Claimed = 3680.462781237034072255 DFT to distribute
  console.log(allocated.sub(claimed).toString());
};

const main = async () => {
  // await findPoolAllocation();
  const deposits = await getDeposits();
  const depositsV2 = await getDepositsV2();
  const eligibleUsers = await findEligibleUsers(deposits, depositsV2);
  const eligibleTotals = await findTotalEligibleDeposits(eligibleUsers);
  const userShares = await findEligibleUserShares(
    eligibleUsers,
    eligibleTotals
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
