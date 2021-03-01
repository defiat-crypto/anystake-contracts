// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IAnyStakeBooster {
    function viewBoost(address user) external view returns (uint256);
    function viewLockTime(address user) external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
}