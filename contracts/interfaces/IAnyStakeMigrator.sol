// SPDX-License-Identifier: MIT


pragma solidity ^0.6.0;

interface IAnyStakeMigrator {
    function migrate(address user, address token, uint256 amount) external;
}