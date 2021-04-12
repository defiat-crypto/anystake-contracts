import * as chai from "chai";
import { waffleChai } from "@ethereum-waffle/chai";
import { IERC20 } from "../typechain";
chai.use(waffleChai);

import { ethers, deployments, getNamedAccounts } from "hardhat";
import {
  Accounts,
  addLiquidity,
  approveToken,
  buyToken,
  depositForWeth,
  getAccount,
  getERC20At,
} from "../utils";
import {
  getAnyStakeDeploymentPools,
  getAnyStakeV2DeploymentPools,
} from "../utils/pools";
import { setupAnyStakeMigration } from "../utils/migrate";
import { advanceNBlocks } from "../utils/time";

export const setupTest = deployments.createFixture(async (hre, options) => {
  await deployments.fixture(["AnyStake", "Regulator", "Vault"]);
  const accounts = await setupAccounts();
  return accounts;
});

export const setupDeployTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture(["AnyStake", "Regulator"]);
    const accounts = await setupAccounts();
    return accounts;
  }
);

export const setupStakingTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture(["AnyStake", "Regulator", "Vault"]);
    const accounts = await setupAccounts();
    await setupStaking(accounts);
    return accounts;
  }
);

export const setupAnyStakeClaimTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture(["AnyStake", "Regulator", "Vault"]);
    const accounts = await setupAccounts();
    await setupStaking(accounts);
    await setupVaultRewards(accounts);
    await setupAnyStakeClaiming(accounts);
    return accounts;
  }
);

export const setupRegulatorClaimTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture(["AnyStake", "Regulator", "Vault"]);
    const accounts = await setupAccounts();
    await setupStaking(accounts);
    await setupVaultRewards(accounts);
    await setupRegulatorClaiming(accounts);
    return accounts;
  }
);

export const setupPeggedTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture(["AnyStake", "Regulator", "Vault"]);
    const accounts = await setupAccounts();
    await setupStaking(accounts);
    await setupVaultRewards(accounts);
    await setupRegulatorClaiming(accounts);
    await setupPegged(accounts, (options as any).abovePeg as boolean);
    return accounts;
  }
);

export const setupV2Tests = deployments.createFixture(async (hre, options) => {
  await deployments.fixture();
  const accounts = await setupAccounts();
  await setupStaking(accounts);
  return accounts;
});

const setupAccounts = async () => {
  const { mastermind, alpha, beta } = await getNamedAccounts();
  const _mastermind = await getAccount(mastermind);
  const _alpha = await getAccount(alpha);
  const _beta = await getAccount(beta);

  return {
    mastermind: _mastermind,
    alpha: _alpha,
    beta: _beta,
  };
};

const setupStaking = async (accounts: Accounts) => {
  const { alpha, mastermind } = accounts;
  const { token, points } = await getNamedAccounts();
  const { Points, Token } = mastermind;

  // convert ETH to WETH
  console.log("Depositing ETH for WETH...");
  await depositForWeth(alpha.address, ethers.utils.parseEther("10"));
  console.log("Deposited ETH for WETH");

  // buy DFT, DFTPv2, USDC and WBTC test tokens
  console.log("Buying Test Tokens...");
  await buyToken(token, ethers.utils.parseEther("10"), alpha.address);
  await buyToken(points, ethers.utils.parseEther("10"), alpha.address);

  let pid = 0;
  const pools = await getAnyStakeV2DeploymentPools();
  for (const pool of pools) {
    if (pid == 5) {
      await depositForWeth(alpha.address, ethers.utils.parseEther("1"));
    } else if (pid > 2) {
      await buyToken(pool.token, ethers.utils.parseEther("1"), alpha.address);
    }
    pid += 1;
  }

  console.log("Bought Test Tokens.");

  const pointsBalance = await Points.balanceOf(alpha.address);
  const tokenBalance = await Token.balanceOf(alpha.address);

  // Add DFT and DTFPv2 Liquidity to stake in AnyStake
  console.log("Adding DFT and DFTP Liquidity");
  await addLiquidity(
    points,
    pointsBalance,
    ethers.utils.parseEther("5"),
    alpha.address
  );
  await addLiquidity(
    token,
    tokenBalance,
    ethers.utils.parseEther("5"),
    alpha.address
  );
  console.log("Added LP");
};

const setupAnyStakeClaiming = async (accounts: Accounts) => {
  const { alpha } = accounts;
  const { AnyStake } = alpha;
  const pools = await getAnyStakeDeploymentPools();

  let pid = 0;
  for (let pool of pools) {
    const Token = await getERC20At(pool.token, alpha.address);
    await approveToken(pool.token, alpha.address, AnyStake.address);
    const balance = await Token.balanceOf(alpha.address);

    console.log(pid, "Staking", balance.toString());
    await AnyStake.deposit(pid, balance).then((tx) => tx.wait());

    await advanceNBlocks(5);
    pid += 1;
  }
};

const setupRegulatorClaiming = async (accounts: Accounts) => {
  const { alpha } = accounts;
  const { Regulator } = alpha;

  console.log("Staking DFTP in Regulator...");
  await alpha.Points.approve(
    Regulator.address,
    ethers.constants.MaxUint256
  ).then((tx) => tx.wait());
  await Regulator.deposit(ethers.utils.parseEther("1000")).then((tx) =>
    tx.wait()
  );
  console.log("Staked DFTP in Regulator.");
};

const setupVaultRewards = async (accounts: Accounts) => {
  const { mastermind } = accounts;
  const { Token, Vault } = mastermind;

  // Load Vault with rewards
  console.log("Transferring Vault fee rewards...");
  await Token.transfer(
    Vault.address,
    ethers.utils.parseEther("100")
  ).then((tx) => tx.wait());
  console.log("Transferred Fee rewards.");

  console.log("Bonding Vault rewards...");
  await Token.approve(Vault.address, ethers.constants.MaxUint256).then((tx) =>
    tx.wait()
  );
  await Vault.addBondedRewards(
    ethers.utils.parseEther("1000"),
    1000
  ).then((tx) => tx.wait());
  console.log("Bonded rewards.");
};

const setupPegged = async (accounts: Accounts, abovePeg: boolean) => {
  const { mastermind } = accounts;
  const { Regulator } = mastermind;

  if (abovePeg) {
    await Regulator.setPriceMultiplier(10000000).then((tx) => tx.wait());
  } else {
    await Regulator.setPriceMultiplier(1).then((tx) => tx.wait());
  }
};
