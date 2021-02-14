// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IAnyStakeVault {
    function buyDeFiatWithTokens(address token, uint256 amount) external;
    function buyPointsWithTokens(address token, uint256 amount) external;

    function distributeRewards() external;
    function getTokenPrice(address token, address lpToken) external view returns (uint256);
}