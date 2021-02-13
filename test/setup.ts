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
  const { usdc, core, tokenLp, pointsLp } = await getNamedAccounts();
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

  // // convert ETH to WETH
  await depositForWeth(alpha.address, ethers.utils.parseEther("10"));
  console.log("deposit eth for weth");

  // buy USDC and CORE test tokens
  await buyToken(usdc, ethers.utils.parseEther("10"), alpha.address);
  await buyToken(core, ethers.utils.parseEther("10"), alpha.address);
  console.log("buy test tokens");

  const pointsLpBalance = await PointsLp.balanceOf(mastermind.address);
  const tokenLpBalance = await TokenLp.balanceOf(mastermind.address);

  // send alpha dftLP, dftpLP, dft, and dftp
  await Points.overrideLoyaltyPoints(
    alpha.address,
    ethers.utils.parseEther("10000")
  ).then((tx) => tx.wait());
  await PointsLp.transfer(alpha.address, pointsLpBalance).then((tx) =>
    tx.wait()
  );
  await Token.transfer(
    alpha.address,
    ethers.utils.parseEther("100000")
  ).then((tx) => tx.wait());
  await TokenLp.transfer(alpha.address, tokenLpBalance).then((tx) => tx.wait());
};
