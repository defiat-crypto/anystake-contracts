import { BigNumber, BigNumberish } from "ethers";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import {
  Accounts,
  addLiquidity,
  approveToken,
  buyToken,
  depositForWeth,
  getAccount,
  getRouter,
  sellToken,
} from "../utils";

import * as chai from "chai";
import { waffleChai } from "@ethereum-waffle/chai";
import { IERC20 } from "../typechain";
chai.use(waffleChai);

export const tokens = [
  { address: "", amount: "" },
  { address: "", amount: "" },
  { address: "", amount: "" },
  { address: "", amount: "" },
  { address: "", amount: "" },
];

export const setupTest = deployments.createFixture(async (hre, options) => {
  await deployments.fixture();
  const accounts = await setupAccounts();
  return accounts;
});

export const setupDeployTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture([
      "Gov",
      "Points",
      "Token",
      "Uniswap",
      "AnyStake",
      "Regulator",
    ]);
    const accounts = await setupAccounts();
    return accounts;
  }
);

export const setupStakingTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture();
    const accounts = await setupAccounts();
    await setupUniswap(accounts);
    return accounts;
  }
);

export const setupClaimTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture();
    const accounts = await setupAccounts();
    await setupUniswap(accounts);
    await setupClaiming(accounts);
    return accounts;
  }
);

export const setupPeggedTest = deployments.createFixture(
  async (hre, options) => {
    await deployments.fixture();
    const accounts = await setupAccounts();
    await setupUniswap(accounts);
    await setupClaiming(accounts);
    await setupPegged(accounts, (options as any).abovePeg as boolean);
    return accounts;
  }
);

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

const setupUniswap = async (accounts: Accounts) => {
  const { alpha, mastermind } = accounts;
  const { usdc, wbtc, tokenLp, pointsLp } = await getNamedAccounts();
  const { Points, Token } = mastermind;

  const TokenLp = (await ethers.getContractAt(
    "IERC20",
    tokenLp,
    mastermind.address
  )) as IERC20;
  const PointsLp = (await ethers.getContractAt(
    "IERC20",
    pointsLp,
    mastermind.address
  )) as IERC20;

  // convert ETH to WETH
  console.log("Depositing ETH for WETH...");
  await depositForWeth(alpha.address, ethers.utils.parseEther("10"));
  console.log("Deposited ETH for WETH");

  // buy USDC and CORE test tokens
  console.log("Buying USDC and WBTC Test Tokens...");
  await buyToken(usdc, ethers.utils.parseEther("10"), alpha.address);
  await buyToken(wbtc, ethers.utils.parseEther("10"), alpha.address);
  console.log("Bought Test Tokens.");

  const pointsLpBalance = await PointsLp.balanceOf(mastermind.address);
  const tokenLpBalance = await TokenLp.balanceOf(mastermind.address);

  // send alpha dftLP, dftpLP, dft, and dftp
  console.log("Send Alpha address DFTP and DFTP/ETH LP...");
  await Points.overrideDiscount(mastermind.address, 100).then((tx) =>
    tx.wait()
  );
  await Points.overrideLoyaltyPoints(
    alpha.address,
    ethers.utils.parseEther("10000")
  ).then((tx) => tx.wait());
  await PointsLp.transfer(alpha.address, pointsLpBalance).then((tx) =>
    tx.wait()
  );
  console.log("Sent Alpha address Points tokens.");

  console.log("Send Alpha address DFT and DFT/ETH LP...");
  await Token.transfer(
    alpha.address,
    ethers.utils.parseEther("100000")
  ).then((tx) => tx.wait());
  await TokenLp.transfer(alpha.address, tokenLpBalance).then((tx) => tx.wait());
  console.log("Sent Alpha address DeFiat tokens.");
};

const setupClaiming = async (accounts: Accounts) => {
  const { alpha, mastermind } = accounts;
  const { tokenLp, usdc } = await getNamedAccounts();
  const { AnyStake, Regulator } = alpha;
  const { Token, Vault } = mastermind;

  const tokens = [
    { symbol: "DFT/ETH", address: tokenLp, pid: 0 },
    { symbol: "USDC", address: usdc, pid: 2 },
  ];

  for (let token of tokens) {
    console.log(`Staking ${token.symbol} tokens in AnyStake...`);
    const TokenLp = (await ethers.getContractAt(
      "IERC20",
      token.address,
      alpha.address
    )) as IERC20;
    const balance = await TokenLp.balanceOf(alpha.address);
    await TokenLp.approve(
      AnyStake.address,
      ethers.constants.MaxUint256
    ).then((tx) => tx.wait());
    await AnyStake.deposit(token.pid, balance).then((tx) => tx.wait());
    console.log(`Staked ${token.symbol} tokens in AnyStake.`);
  }

  console.log("Staking DFTP tokens in Regulator...");
  await alpha.Points.approve(
    Regulator.address,
    ethers.constants.MaxUint256
  ).then((tx) => tx.wait());
  await Regulator.deposit(ethers.utils.parseEther("1000")).then((tx) =>
    tx.wait()
  );
  console.log("Staked DFTP in Regulator.");

  // Load Vault with rewards
  await Token.transfer(
    Vault.address,
    ethers.utils.parseEther("1000")
  ).then((tx) => tx.wait());
};

const setupPegged = async (accounts: Accounts, abovePeg: boolean) => {
  const { mastermind } = accounts;
  const { Token } = mastermind;

  if (abovePeg) {
    await sellToken(
      Token.address,
      ethers.utils.parseEther("50000"),
      mastermind.address
    );
  } else {
    await buyToken(
      Token.address,
      ethers.utils.parseEther("100"),
      mastermind.address
    );
  }
};
