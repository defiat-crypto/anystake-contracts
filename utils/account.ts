import { ethers, getNamedAccounts } from "hardhat";
import { AnyStake, AnyStakeRegulator, AnyStakeVault } from "../typechain";
import {
  DeFiatGov,
  DeFiatPoints,
  DeFiatToken,
} from "@defiat-crypto/core-contracts/typechain";
import DeFiatGovAbi from "@defiat-crypto/core-contracts/abi/DeFiatGov.json";
import DeFiatPointsAbi from "@defiat-crypto/core-contracts/abi/DeFiatPoints.json";
import DeFiatTokenAbi from "@defiat-crypto/core-contracts/abi/DeFiatToken.json";

export interface Accounts {
  mastermind: Account;
  alpha: Account;
  beta: Account;
}

export interface Account {
  address: string;
  Gov: DeFiatGov;
  Points: DeFiatPoints;
  Token: DeFiatToken;
  AnyStake: AnyStake;
  Regulator: AnyStakeRegulator;
  Vault: AnyStakeVault;
}

export const getAccount = async (account: string): Promise<Account> => {
  const { gov, points, token } = await getNamedAccounts();
  const Gov = await getGovAt(gov, account);
  const Points = await getPointsAt(points, account);
  const Token = await getTokenAt(token, account);
  const AnyStake = await getAnyStake(account);
  const Regulator = await getRegulator(account);
  const Vault = await getVault(account);

  return {
    address: account,
    Token,
    Points,
    Gov,
    AnyStake,
    Regulator,
    Vault,
  };
};

export const getAnyStake = async (account: string) => {
  return (await ethers.getContractOrNull("AnyStake", account)) as AnyStake;
};

export const getRegulator = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeRegulator",
    account
  )) as AnyStakeRegulator;
};

export const getVault = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeVault",
    account
  )) as AnyStakeVault;
};

export const getTokenAt = async (
  token: string,
  account: string
): Promise<DeFiatToken> => {
  return (await ethers.getContractAt(
    DeFiatTokenAbi,
    token,
    account
  )) as DeFiatToken;
};

export const getPointsAt = async (
  points: string,
  account: string
): Promise<DeFiatPoints> => {
  return (await ethers.getContractAt(
    DeFiatPointsAbi,
    points,
    account
  )) as DeFiatPoints;
};

export const getGovAt = async (
  gov: string,
  account: string
): Promise<DeFiatGov> => {
  return (await ethers.getContractAt(DeFiatGovAbi, gov, account)) as DeFiatGov;
};
