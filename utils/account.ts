import { ethers, getNamedAccounts } from "hardhat";
import {
  AnyStake,
  AnyStakeRegulator,
  AnyStakeRegulatorV2,
  AnyStakeV2,
  AnyStakeVault,
  AnyStakeVaultV2,
} from "../typechain";
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
  AnyStakeV2: AnyStakeV2;
  RegulatorV2: AnyStakeRegulatorV2;
  VaultV2: AnyStakeVaultV2;
}

export const getAccount = async (account: string): Promise<Account> => {
  const { gov, points, token } = await getNamedAccounts();
  const Gov = await getGovAt(gov, account);
  const Points = await getPointsAt(points, account);
  const Token = await getTokenAt(token, account);
  const AnyStake = await getAnyStake(account);
  const Regulator = await getRegulator(account);
  const Vault = await getVault(account);
  const AnyStakeV2 = await getAnyStakeV2(account);
  const RegulatorV2 = await getRegulatorV2(account);
  const VaultV2 = await getVaultV2(account);

  return {
    address: account,
    Token,
    Points,
    Gov,
    AnyStake,
    Regulator,
    Vault,
    AnyStakeV2,
    RegulatorV2,
    VaultV2,
  };
};

export const getAnyStake = async (account: string) => {
  return (await ethers.getContractOrNull("AnyStake", account)) as AnyStake;
};

export const getAnyStakeAt = async (anystake: string, account: string) => {
  return (await ethers.getContractAt(
    "AnyStake",
    anystake,
    account
  )) as AnyStake;
};

export const getAnyStakeV2 = async (account: string) => {
  return (await ethers.getContractOrNull("AnyStakeV2", account)) as AnyStakeV2;
};

export const getAnyStakeV2At = async (anystake: string, account: string) => {
  return (await ethers.getContractAt(
    "AnyStakeV2",
    anystake,
    account
  )) as AnyStakeV2;
};

export const getRegulator = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeRegulator",
    account
  )) as AnyStakeRegulator;
};

export const getRegulatorAt = async (regulator: string, account: string) => {
  return (await ethers.getContractAt(
    "AnyStakeRegulator",
    regulator,
    account
  )) as AnyStakeRegulator;
};

export const getRegulatorV2 = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeRegulatorV2",
    account
  )) as AnyStakeRegulatorV2;
};

export const getRegulatorV2At = async (regulator: string, account: string) => {
  return (await ethers.getContractAt(
    "AnyStakeRegulatorV2",
    regulator,
    account
  )) as AnyStakeRegulatorV2;
};

export const getVault = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeVault",
    account
  )) as AnyStakeVault;
};

export const getVaultV2 = async (account: string) => {
  return (await ethers.getContractOrNull(
    "AnyStakeVaultV2",
    account
  )) as AnyStakeVaultV2;
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
