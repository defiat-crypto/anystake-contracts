import { DeployFunction } from "hardhat-deploy/types";
import { AnyStake } from "../typechain";
import { getGovAt, getPointsAt } from "../utils";
import { getAnyStakeDeploymentPools } from "../utils/pools";

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  ethers,
  network,
}) => {
  const { deploy } = deployments;
  const {
    gov,
    mastermind,
    points,
    pointsLp,
    token,
    tokenLp,
    uniswap,
    zero,
    feeToken,
    feeTokenLp,
    varToken,
    varTokenLp,
  } = await getNamedAccounts();

  console.log("Deploying with ", mastermind);

  const result = await deploy("AnyStake", {
    from: mastermind,
    log: true,
    args: [uniswap, gov, points, token],
  });

  const anystake = (await ethers.getContract(
    "AnyStake",
    mastermind
  )) as AnyStake;

  const Gov = await getGovAt(gov, mastermind);
  const Points = await getPointsAt(points, mastermind);

  if (result.newlyDeployed) {
    await Gov.setActorLevel(result.address, 2).then((tx) => tx.wait());
    await Points.overrideDiscount(result.address, 100).then((tx) => tx.wait());
    await Points.setWhitelisted(result.address, true).then((tx) => tx.wait());
  }

  if (!network.live || network.name == "mainnet") {
    const pools = await getAnyStakeDeploymentPools();
    const tokens = pools.map((pool) => pool.token);
    const lpTokens = pools.map((pool) => pool.lpToken);
    const allocPoints = pools.map((pool) => pool.allocPoint);
    const vipAmount = pools.map((pool) => pool.vipAmount);
    const feeAmount = pools.map((pool) => pool.feeAmount);

    await anystake
      .addPoolBatch(tokens, lpTokens, allocPoints, vipAmount, feeAmount)
      .then((tx) => tx.wait());
  } else if (network.name == "rinkeby") {
    // const feeToken = await deploy("FeeOnTransferToken", {
    //   from: mastermind,
    //   log: true,
    //   args: ["1% Fee Token", "1FEE", 10],
    // });
    // const varToken = await deploy("VariableDecimalToken", {
    //   from: mastermind,
    //   log: true,
    //   args: ["8 Decimal Token", "8BALL", 8],
    // });

    // if (feeToken.newlyDeployed && varToken.newlyDeployed) {
    //   const FeeToken = (await ethers.getContract(
    //     "FeeOnTransferToken",
    //     mastermind
    //   )) as FeeOnTransferToken;
    //   const VarToken = (await ethers.getContract(
    //     "VariableDecimalToken",
    //     mastermind
    //   )) as VariableDecimalToken;

    //   await FeeToken.faucet().then((tx) => tx.wait());
    //   await VarToken.faucet().then((tx) => tx.wait());

    //   await approveToken(feeToken.address, mastermind, uniswap);
    //   await approveToken(varToken.address, mastermind, uniswap);

    //   await addLiquidity(
    //     feeToken.address,
    //     ethers.utils.parseEther("100"),
    //     ethers.utils.parseEther("1"),
    //     mastermind
    //   );
    //   await addLiquidity(
    //     varToken.address,
    //     BigNumber.from(100).mul(1e8),
    //     ethers.utils.parseEther("1"),
    //     mastermind
    //   );
    // }

    // const router = await getRouter(mastermind);
    // const factoryAddress = await router.factory();
    // const wethAddress = await router.WETH();

    // const factory = (await ethers.getContractAt(
    //   "IUniswapV2Factory",
    //   factoryAddress,
    //   mastermind
    // )) as IUniswapV2Factory;
    // const feeTokenLp = await factory.getPair(feeToken.address, wethAddress);
    // const varTokenLp = await factory.getPair(varToken.address, wethAddress);

    if (result.newlyDeployed) {
      await anystake
        .addPoolBatch(
          [token, tokenLp, pointsLp, varToken, feeToken],
          [tokenLp, zero, zero, varTokenLp, feeTokenLp],
          [100, 500, 500, 100, 100],
          [0, 0, 0, ethers.utils.parseEther("10"), 0],
          [0, 0, 0, 50, 50]
        )
        .then((tx) => tx.wait());
    }
  }
};

export default func;
func.tags = ["AnyStake"];
