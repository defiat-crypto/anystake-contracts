import "dotenv/config";
import { HardhatUserConfig, task } from "hardhat/config";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-abi-exporter";
import "hardhat-spdx-license-identifier";
import "hardhat-typechain";
import "hardhat-gas-reporter";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.6.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 150,
      },
    },
  },
  paths: {
    artifacts: "./build/artifacts",
    cache: "./build/cache",
    deployments: "./deployments",
  },
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: true,
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  namedAccounts: {
    mastermind: 0,
    alpha: 1,
    beta: 2,
    user: 3,
    zero: "0x0000000000000000000000000000000000000000",
    uniswap: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdcLp: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
    core: "0x62359ed7505efc61ff1d56fef82158ccaffa23d7",
    coreLp: "0x32Ce7e48debdccbFE0CD037Cc89526E4382cb81b",
    wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    wbtcLp: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940",
    token: {
      1: "0xB6eE603933E024d8d53dDE3faa0bf98fE2a3d6f1",
      4: "0xB571d40e4A7087C1B73ce6a3f29EaDfCA022C5B2",
      31337: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
    },
    points: {
      1: "0xDe3E18eCB613498b9a1483Af51394Ec2259BcD0a",
      4: "0xEe650cDBA51A1cFA7428a4e98Bc801B09F16466A",
      31337: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
    },
    gov: {
      1: "0xefcCb112270c3C197b86ff03D26340d82a087F6c",
      4: "0xfe521318261CAc118981d532C0E8D3C2Bf4C1dcE",
      31337: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
    },
    tokenLp: {
      1: "0xe2a1d215d03d7e9fa0ed66355c86678561e4940a",
      4: "0xF7426EAcb2b00398D4cefb3E24115c91821d6fB0",
      31337: "0xb967F16d2cc4545d168b6a5Ef4a1dF7ad1562f0d",
    },
    pointsLp: {
      1: "0xb4c36b752b706836ab90ed4e78b058150ae9ed59",
      4: "0xCEBF1e6b266DCE1a32ac57Ee4C0e3100d3198e56",
      31337: "0xd2b58626f0e56E2EE4cD888F07F544959dbDe046",
    },
  },
  // external: {
  //   contracts: [
  //     {
  //       artifacts: "node_modules/@defiat-crypto/core-contracts/build/artifacts",
  //       // deploy: "./node_modules/@defiat-crypto/core-contracts/build/deploy",
  //     },
  //   ],
  // },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1,
      accounts: [
        {
          privateKey: process.env.DEPLOYER_MAIN_KEY
            ? `0x${process.env.DEPLOYER_MAIN_KEY}`
            : "",
          balance: "10000000000000000000000000000000000",
        },
        {
          privateKey:
            "0x79b42ca52f100b30062e8a0191c9b2c7842780c40a331eecd7edc9f41ff273d3",
          balance: "10000000000000000000000000000000000",
        },
        {
          privateKey:
            "0xfb43ffdd7d5feca61a1fe1bb31bbbd77733c06f6f67a6b284864063103724abb",
          balance: "10000000000000000000000000000000000",
        },
      ],
      forking: {
        blockNumber: 12042485,
        url: process.env.ALCHEMY_MAIN_KEY || "",
        enabled: true,
      },
    },
    localhost: {
      url: "http://localhost:8545",
    },
    rinkeby: {
      accounts: process.env.DEPLOYER_RINKEBY_KEY
        ? [`0x${process.env.DEPLOYER_RINKEBY_KEY}`]
        : undefined,
      url: process.env.ALCHEMY_RINKEBY_KEY || "",
    },
    mainnet: {
      accounts: process.env.DEPLOYER_MAIN_KEY
        ? [`0x${process.env.DEPLOYER_MAIN_KEY}`]
        : undefined,
      url: process.env.ALCHEMY_MAIN_KEY || "",
    },
  },
};

export default config;
