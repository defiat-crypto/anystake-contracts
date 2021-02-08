import "dotenv/config";
import { HardhatUserConfig, task } from "hardhat/config";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "hardhat-spdx-license-identifier";
import "hardhat-typechain";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: "0.6.6",
  paths: {
    artifacts: "./build/artifacts",
    cache: "./build/cache",
    deployments: "./build/deployments",
  },
  abiExporter: {
    path: "./build/abi",
    clear: true,
    flat: true,
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  namedAccounts: {
    mastermind: 0, //"0x4F4B49E7f3661652F13A6D2C86d9Af4435414721",
    governor: 1,
    partner: 2,
    user: 3,
    uniswap: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    core: "0x62359ed7505efc61ff1d56fef82158ccaffa23d7",
    token: {
      1: "0xB6eE603933E024d8d53dDE3faa0bf98fE2a3d6f1",
      4: "0xB571d40e4A7087C1B73ce6a3f29EaDfCA022C5B2",
      31337: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    },
    points: {
      1: "0xeB23dF02AB127aF9249227441BC4Df4d5230f02A",
      4: "0x70c7d7856e1558210cfbf27b7f17853655752453",
      31337: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    },
    gov: {
      1: "0x3Aa3303877A0D1c360a9FE2693AE9f31087A1381",
      4: "0x064fd7d9c228e8a4a2bf247b432a34d6e1cb9442",
      31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    },
  },
  external: {
    contracts: [
      {
        artifacts: "node_modules/@defiat-crypto/core-contracts/build/artifacts",
        deploy: "node_modules/@defiat-crypto/core-contracts/build/deploy",
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        blockNumber: 11812500,
        url: process.env.ALCHEMY_MAIN_PROD_KEY || "",
        enabled: true,
      },
    },
    localhost: {
      url: "http://localhost:8545",
    },
  },
};

export default config;
