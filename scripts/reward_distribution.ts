import { BigNumber } from "@ethersproject/bignumber";
import { getNamedAccounts } from "hardhat";
import { getAnyStake, getVault } from "../utils";
import fs from "fs";
import path from "path";
import { Event } from "@ethersproject/contracts";

const START_BLOCK = 12175584;
const END_BLOCK = 0;
const WRITE_FILE = true;

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
  // console.log(aggregated);

  // aggregate by pool for output
  const pools = await aggregateByPool(deposits);

  // format into CSV
  if (WRITE_FILE) {
    await writeToFile(pools, "../files/deposits.csv");
  }
};

const getClaims = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStake = await getAnyStake(deployer);

  // find all deposit events
  const filter = AnyStake.filters.Claim(null, null, null);
  const events = await AnyStake.queryFilter(filter, 12175584);

  const claims = await aggregateEvents(events);
  const totalClaimed = claims
    .reduce(
      (sum: BigNumber, next: AnyStakeEvent) =>
        BigNumber.from(sum).add(next.amount),
      BigNumber.from(0)
    )
    // .mul(BigNumber.from(10).pow(18))
    // .div(BigNumber.from(10).pow(18))
    .toString();
  console.log(`Total Claims: ${claims.length}`);
  console.log(`Total DFT Claimed: ${totalClaimed}`);

  // const users = await aggregateByUser(claims);
  const pools = await aggregateByPool(claims);

  // format into CSV
  if (WRITE_FILE) {
    await writeToFile(pools, "../files/claims.csv");
  }
};

const getWithdraws = async () => {
  const { deployer } = await getNamedAccounts();
  const AnyStake = await getAnyStake(deployer);

  // find all deposit events
  const filter = AnyStake.filters.Withdraw(null, null, null);
  const events = await AnyStake.queryFilter(filter, 12175584);

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
};

const aggregateByUser = async (deposits: AnyStakeEvent[]) => {
  let aggregated: any = {};

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

const main = async () => {
  await getDeposits();
  await getClaims();
  await getWithdraws();
  await getRewardsDistributed();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
