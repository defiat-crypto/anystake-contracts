// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../lib/@defiat/utils/DeFiatGovernedUtils.sol";
import "../lib/@openzeppelin/token/ERC20/SafeERC20.sol";
import "../lib/@uniswap/interfaces/IUniswapV2Router02.sol";

abstract contract AnyStakeUtils is DeFiatGovernedUtils {
    using SafeERC20 for IERC20;
  
    address public router;
    address public factory;
    address public weth;
    address public DeFiatToken;
    address public DeFiatPoints;
    address public DeFiatTokenLp;
    address public DeFiatPointsLp;

    constructor(address _router, address _gov, address _points, address _token) public {
        _setGovernance(_gov);

        router = _router;
        DeFiatPoints = _points;
        DeFiatToken = _token;
         
        weth = IUniswapV2Router02(router).WETH();
        factory = IUniswapV2Router02(router).factory();
        DeFiatTokenLp = address(0);// IUniswapV2Factory(factory).getPair(dft, weth);
        DeFiatPointsLp = address(0); //IUniswapV2Factory(factory).getPair(dftp, weth);
    }

    // Method to avoid underflow on token transfers
    function safeTokenTransfer(address user, address token, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (amount > tokenBalance) {
            IERC20(token).safeTransfer(user, tokenBalance);
        } else {
            IERC20(token).safeTransfer(user, amount);
        }
    }

    function setToken(address _token) external onlyGovernor {

    }

    function setPoints(address _points) external onlyGovernor {
        
    }
}