import { BigNumber, BigNumberish } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { IERC20, IUniswapV2Router02, IWETH } from "../typechain";

export const approveToken = async (
  address: string,
  signer: string,
  spender: string
) => {
  const Token = await getToken(address, signer);
  await Token.approve(spender, ethers.constants.MaxUint256).then((tx) =>
    tx.wait()
  );
};

export const buyToken = async (
  address: string,
  value: BigNumberish,
  signer: string
): Promise<BigNumberish> => {
  const Token = await getToken(address, signer);
  const Router = await getRouter(signer);
  const WETH = await Router.WETH();

  await Router.swapExactETHForTokensSupportingFeeOnTransferTokens(
    "0",
    [WETH, address],
    signer,
    Date.now() + 30000,
    {
      value,
    }
  ).then((tx) => tx.wait());

  const balance = await Token.balanceOf(signer);
  return balance;
};

export const addLiquidity = async (
  address: string,
  amount: BigNumberish,
  value: BigNumberish,
  signer: string
): Promise<BigNumberish> => {
  const Token = await getToken(address, signer);
  const Router = await getRouter(signer);

  await Router.addLiquidityETH(
    address,
    amount,
    "0",
    "0",
    signer,
    Date.now() + 30000,
    {
      value,
    }
  ).then((tx) => tx.wait());

  // const balance = await
  return 0;
};

export const depositForWeth = async (signer: string, value: BigNumberish) => {
  const router = await getRouter(signer);
  const wethAddress = await router.WETH();
  const WETH = (await ethers.getContractAt(
    "IWETH",
    wethAddress,
    signer
  )) as IWETH;
  await WETH.deposit({ value }).then((tx) => tx.wait());
};

export const getRouter = async (signer: string) => {
  const { uniswap } = await getNamedAccounts();
  return (await ethers.getContractAt(
    "IUniswapV2Router02",
    uniswap,
    signer
  )) as IUniswapV2Router02;
};

export const getToken = async (address: string, signer: string) => {
  return (await ethers.getContractAt("IERC20", address, signer)) as IERC20;
};
