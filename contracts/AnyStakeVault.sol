// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/@uniswap/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IAnyStake.sol";
import "./interfaces/IAnyStakeRegulator.sol";
import "./interfaces/IAnyStakeVault.sol";
import "./utils/AnyStakeUtils.sol";

// Vault distributes tokens to AnyStake, get token prices (oracle) and performs buybacks operations.
contract AnyStakeVault is IAnyStakeVault, AnyStakeUtils {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event DFTBuyback(address indexed token, uint256 tokenAmount, uint256 buybackAmount);
    event DistributedRewards(address indexed user, uint256 anystakeAmount, uint256 regulatorAmount, uint256 bountyAmount);

    string public constant UNI_SYMBOL = "UNI-V2";

    address public AnyStake;
    address public Regulator;
    uint256 public distributionBounty; // % of collected rewards paid for distributing to AnyStake pools
    uint256 public distributionRate; // % of rewards which are sent to AnyStake
    uint256 public totalBuybackAmount;
    uint256 public totalRewardsDistributed;

    IERC20 DeFiat;
    IUniswapV2Router02 Router; 

    modifier onlyAnyStake() {
        require(msg.sender == AnyStake, "Vault: Only AnyStake allowed");
        _;
    }
    
    constructor(address _router, address _gov, address _token, address _points, address _anystake, address _regulator) 
        public
        AnyStakeUtils(_router, _gov, _token, _points)
    {
        AnyStake = _anystake;
        Regulator = _regulator;
        distributionBounty = 30; // 3%, base 100
        distributionRate = 800; // 80%, base 100
    }

    // Reward Distribution
    
    function distributeRewards() external override {
        uint256 amount = DeFiat.balanceOf(address(this));
        uint256 bountyAmount = amount.mul(distributionBounty).div(1000);
        uint256 rewardAmount = amount.sub(bountyAmount);
        uint256 anystakeAmount = rewardAmount.mul(distributionRate).div(1000);
        uint256 regulatorAmount = rewardAmount.sub(anystakeAmount);

        DeFiat.safeTransfer(AnyStake, anystakeAmount);
        DeFiat.safeTransfer(Regulator, regulatorAmount);

        IAnyStake(AnyStake).massUpdatePools();
        IAnyStakeRegulator(Regulator).updatePool();

        if (bountyAmount > 0) {
            DeFiat.safeTransfer(msg.sender, bountyAmount);
        }

        emit DistributedRewards(msg.sender, anystakeAmount, regulatorAmount, bountyAmount);
    }

    function setDistributionBounty(uint256 bounty) external onlyGovernor {
        require(bounty <= 1000, "Cannot be greater than 100%");
        distributionBounty = bounty;
    }

    function setDistributionRate(uint256 rate) external onlyGovernor {
        require(rate <= 1000, "Cannot be greater than 100%");
        distributionRate = rate;
    }
    
    
    // PRICE ORACLE

    // internal view function to view price of any token in ETH
    // return is 1e18. max Solidity is 1e77. 
    function getTokenPrice(address token, address lpToken) public override view returns (uint256) {
        if (token == weth) {
            return 1e18;
        }
        
        bool isLpToken = isLiquidityToken(token);
        IUniswapV2Pair pair = isLpToken ? IUniswapV2Pair(token) : IUniswapV2Pair(lpToken);
        
        uint256 wethReserves;
        uint256 tokenReserves;
        if (pair.token0() == weth) {
            (wethReserves, tokenReserves, ) = pair.getReserves();
        } else {
            (tokenReserves, wethReserves, ) = pair.getReserves();
        }
        
        if (tokenReserves == 0) {
            return 0;
        } else if (isLpToken) {
            return wethReserves.mul(2e18).div(IERC20(token).totalSupply());
        } else {
            uint256 adjuster = 36 - uint256(IERC20(token).decimals());
            uint256 tokensPerEth = tokenReserves.mul(10**adjuster).div(wethReserves);
            return uint256(1e36).div(tokensPerEth);
        }
    }

    function isLiquidityToken(address token) internal view returns (bool) {
        return keccak256(bytes(IERC20(token).symbol())) == keccak256(bytes(UNI_SYMBOL));
    }
    
    
    // UNISWAP PURCHASES
    
    //Buyback tokens with the staked fees (returns amount of tokens bought)
    //send procees to treasury for redistribution
    function buyDFTWithETH(uint256 amount) external override onlyAnyStake {
        if (amount == 0) {
            return;
        }

        address[] memory UniSwapPath = new address[](2);
        UniSwapPath[0] = weth;
        UniSwapPath[1] = DeFiatToken;
     
        uint256 amountBefore = DeFiat.balanceOf(address(this));
        
        Router.swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: amount
        }(
            0,
            UniSwapPath, 
            address(this), 
            block.timestamp + 5 minutes
        );

        uint256 amountAfter = DeFiat.balanceOf(address(this));
        
        emit DFTBuyback(weth, amount, amountAfter.sub(amountBefore));
    }

    function buyDFTWithTokens(address token, uint256 amount) external override onlyAnyStake {
        if (amount == 0) {
            return;
        }
        
        address[] memory UniSwapPath = new address[](token == weth ? 2 : 3);
        if (token == weth) {
            UniSwapPath[0] = weth; // WETH in
            UniSwapPath[1] = DeFiatToken; // DFT out
        } else {
            UniSwapPath[0] = token; // ERC20 in
            UniSwapPath[1] = weth; // WETH intermediary
            UniSwapPath[2] = DeFiatToken; // DFT out
        }
     
        uint256 amountBefore = DeFiat.balanceOf(address(this)); // snapshot
        
        if (IERC20(token).allowance(address(this), router) == 0) {
            IERC20(token).approve(router, 2 ** 256 - 1);
        }

        Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount, 
            0,
            UniSwapPath,
            address(this),
            block.timestamp + 5 minutes
        );

        uint256 amountAfter = DeFiat.balanceOf(address(this));
        
        emit DFTBuyback(token, amount, amountAfter.sub(amountBefore));
    }

    function setAnyStake(address _anystake) external onlyGovernor {

    }

    function setRegulator(address _regulator) external onlyGovernor {

    }
}