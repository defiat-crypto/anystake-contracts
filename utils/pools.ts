import { ethers, getNamedAccounts } from "hardhat";

export const getAnyStakeDeploymentPools = async () => {
  const {
    zero,
    token,
    tokenLp,
    pointsLp,
    usdc,
    usdcLp,
    wbtc,
    wbtcLp,
    weth,
    uni,
    uniLp,
    link,
    linkLp,
    mkr,
    mkrLp,
    sushi,
    sushiLp,
    xft,
    xftLp,
    chart,
    chartLp,
    qnt,
    qntLp,
    erowan,
    erowanLp,
    grt,
    grtLp,
    mir,
    mirLp,
    farm,
    farmLp,
    ilv,
    ilvLp,
    kine,
    kineLp,
    zeroToken,
    zeroTokenLp,
    dai,
    daiLp,
    core,
    coreLp,
  } = await getNamedAccounts();

  return [
    {
      token: token,
      lpToken: tokenLp,
      allocPoint: 200,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: tokenLp,
      lpToken: zero,
      allocPoint: 1500,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: pointsLp,
      lpToken: zero,
      allocPoint: 1500,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: usdc,
      lpToken: usdcLp,
      allocPoint: 400,
      vipAmount: ethers.utils.parseEther("25"),
      feeAmount: 50,
    },
    {
      token: wbtc,
      lpToken: wbtcLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: weth,
      lpToken: zero,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: uni,
      lpToken: uniLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: link,
      lpToken: linkLp,
      allocPoint: 400,
      vipAmount: ethers.utils.parseEther("25"),
      feeAmount: 50,
    },
    {
      token: mkr,
      lpToken: mkrLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: sushi,
      lpToken: sushiLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: xft,
      lpToken: xftLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: chart,
      lpToken: chartLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: qnt,
      lpToken: qntLp,
      allocPoint: 400,
      vipAmount: ethers.utils.parseEther("25"),
      feeAmount: 50,
    },
    {
      token: erowan,
      lpToken: erowanLp,
      allocPoint: 400,
      vipAmount: ethers.utils.parseEther("25"),
      feeAmount: 50,
    },
    {
      token: grt,
      lpToken: grtLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: mir,
      lpToken: mirLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: farm,
      lpToken: farmLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: kine,
      lpToken: kineLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: zeroToken,
      lpToken: zeroTokenLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: dai,
      lpToken: daiLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
    {
      token: core,
      lpToken: coreLp,
      allocPoint: 100,
      vipAmount: 0,
      feeAmount: 50,
    },
  ];
};

export const getAnyStakeV2DeploymentPools = async () => {
  const {
    zero,
    token,
    tokenLp,
    pointsLp,
    usdc,
    usdcLp,
    wbtc,
    wbtcLp,
    weth,
    uni,
    uniLp,
    link,
    linkLp,
    mkr,
    mkrLp,
    sushi,
    sushiLp,
    xft,
    xftLp,
    chart,
    chartLp,
    qnt,
    qntLp,
    erowan,
    erowanLp,
    grt,
    grtLp,
    mir,
    mirLp,
    farm,
    farmLp,
    ilv,
    ilvLp,
    kine,
    kineLp,
    zeroToken,
    zeroTokenLp,
    dai,
    daiLp,
    core,
    coreLp,
    ultra,
    ultraLp,
  } = await getNamedAccounts();

  return [
    {
      token: token,
      lpToken: tokenLp,
      allocPoint: 500,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: tokenLp,
      lpToken: zero,
      allocPoint: 1000,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: pointsLp,
      lpToken: zero,
      allocPoint: 1000,
      vipAmount: 0,
      feeAmount: 0,
    },
    {
      token: usdc,
      lpToken: usdcLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: wbtc,
      lpToken: wbtcLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: weth,
      lpToken: zero,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: uni,
      lpToken: uniLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: link,
      lpToken: linkLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: mkr,
      lpToken: mkrLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: sushi,
      lpToken: sushiLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: xft,
      lpToken: xftLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: chart,
      lpToken: chartLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: qnt,
      lpToken: qntLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: erowan,
      lpToken: erowanLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: grt,
      lpToken: grtLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: mir,
      lpToken: mirLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: farm,
      lpToken: farmLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: kine,
      lpToken: kineLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: zeroToken,
      lpToken: zeroTokenLp,
      allocPoint: 400,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: dai,
      lpToken: daiLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: core,
      lpToken: coreLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
    {
      token: ultra,
      lpToken: ultraLp,
      allocPoint: 100,
      vipAmount: ethers.utils.parseEther("50"),
      feeAmount: 25,
    },
  ];
};
