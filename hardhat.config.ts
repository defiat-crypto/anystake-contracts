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
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    mastermind: 0,
    alpha: 1,
    beta: 2,
    user: 3,
    anystake: {
      1: "0x95EF77772BdAEF25B56ec5f210e02BdaAc40D144",
      4: "0x9b90eF849E9B07b3f7cab85A4b44925511cB27cF",
    },
    regulator: {
      1: "0xbb10bC5a825F3F6b148bF83ED4b679c88ab27B54",
      4: "0x43E042290c18d8Ae0B0F05355fC82e477f1579a9",
    },
    vault: {
      1: "0xDcD7CA4a0feBBF5dcF91499b603c1C073916f9a3",
      4: "0x7b213Ee4ec0f3441926155716d683dc8b3a87aE3",
    },
    zero: "0x0000000000000000000000000000000000000000",
    uniswap: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdcLp: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
    wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    wbtcLp: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940",
    weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    uni: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    uniLp: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
    link: "0x514910771af9ca656af840dff83e8264ecf986ca",
    linkLp: "0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974",
    mkr: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    mkrLp: "0xc2adda861f89bbb333c90c492cb837741916a225",
    sushi: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
    sushiLp: "0xce84867c3c02b05dc570d0135103d3fb9cc19433",
    xft: "0xabe580e7ee158da464b51ee1a83ac0289622e6be",
    xftLp: "0x2b9e92a5b6e69db9fedc47a4c656c9395e8a26d2",
    chart: "0x1d37986f252d0e349522ea6c3b98cb935495e63e",
    chartLp: "0x960d228bb345fe116ba4cba4761aab24a5fa7213",
    qnt: "0x4a220e6096b25eadb88358cb44068a3248254675",
    qntLp: "0x0c4a68cf6857cc76fe946d04fe85fac5fae9625e",
    erowan: "0x07bac35846e5ed502aa91adf6a9e7aa210f2dcbe",
    erowanLp: "0x659a9a43b32bea6c113c393930a45c7634a242d5",
    grt: "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
    grtLp: "0x2e81ec0b8b4022fac83a21b2f2b4b8f5ed744d70",
    mir: "0x09a3ecafa817268f77be1283176b946c4ff2e608",
    mirLp: "0x57ab5aeb8bac2586a0d437163c3eb844246336ce",
    farm: "0xa0246c9032bC3A600820415aE600c6388619A14D",
    farmLp: "0x56feaccb7f750b997b36a68625c7c596f0b41a58",
    ilv: "0x5e49e4710686d43c409a3286d4459b148609966e",
    ilvLp: "0x547ddc3e2339b04d5d8f939bb327aeec7fd23abb",
    kine: "0xcbfef8fdd706cde6f208460f2bf39aa9c785f05d",
    kineLp: "0xb34daaf8832432e5619efcf8262a4f5ecfd1384a",
    zeroToken: "0xf0939011a9bb95c3b791f0cb546377ed2693a574",
    zeroTokenLp: "0x40f0e70a7d565985b967bcdb0ba5801994fc2e80",
    dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
    daiLp: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
    core: "0x62359ed7505efc61ff1d56fef82158ccaffa23d7",
    coreLp: "0x32Ce7e48debdccbFE0CD037Cc89526E4382cb81b",
    ultra: "0xd13c7342e1ef687c5ad21b27c2b65d772cab5c8c",
    ultraLp: "0x42d52847be255eacee8c3f96b3b223c0b3cc0438",
    token: {
      1: "0xB6eE603933E024d8d53dDE3faa0bf98fE2a3d6f1",
      4: "0xB571d40e4A7087C1B73ce6a3f29EaDfCA022C5B2",
      31337: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
    },
    points: {
      1: "0xDe3E18eCB613498b9a1483Af51394Ec2259BcD0a",
      4: "0xb8b8B746ab4B983C0960501146ba6079c1fd2Af3",
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
      4: "0x23A4c03d18666970200A202116Aa8752fbB5a2FB",
      31337: "0xd2b58626f0e56E2EE4cD888F07F544959dbDe046",
    },
    varToken: {
      4: "0xd5d087d31ddcc58c70d0441554dff9c9874c882f",
    },
    varTokenLp: {
      4: "0x29bdf6ef0fe951fb6ea1851084c831cd8386e060",
    },
    feeToken: {
      4: "0x549D392c89ee87C35A75808208b0C8F383AD8B01",
    },
    feeTokenLp: {
      4: "0x0a091ae2ad52e975c3a7cc20e30ae01efd3e9c90",
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
        blockNumber: 12175370,
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
      gasPrice: 240000000000,
      accounts: process.env.DEPLOYER_MAIN_KEY
        ? [`0x${process.env.DEPLOYER_MAIN_KEY}`]
        : undefined,
      url: process.env.ALCHEMY_MAIN_KEY || "",
    },
  },
};

export default config;
