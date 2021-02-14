import { ethers } from "hardhat";
import { AnyStake, AnyStakeRegulator, AnyStakeVault } from "../typechain";
import {
  getGov,
  getPoints,
  getToken,
  // @ts-ignore
} from "@defiat-crypto/core-contracts/build";
import {
  DeFiatGov,
  DeFiatPoints,
  DeFiatToken,
} from "@defiat-crypto/core-contracts/typechain";

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
  const Gov = (await getGov(account)) as DeFiatGov;
  const Points = (await getPoints(account)) as DeFiatPoints;
  const Token = (await getToken(account)) as DeFiatToken;
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
