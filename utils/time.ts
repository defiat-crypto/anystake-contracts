import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";

export const advanceNBlocks = async (n: number) => {
  await ethers.provider.send("evm_increaseTime", [n * 15]);

  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
};

export const getBlockNumber = async () => {
  return BigNumber.from(await ethers.provider.send("eth_blockNumber", []));
};
