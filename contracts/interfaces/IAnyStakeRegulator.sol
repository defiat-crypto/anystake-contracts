pragma solidity ^0.6.0;

interface IAnyStakeRegulator {
    function updatePool() external;
    function claim() external;
    function deposit(uint256 amount) external;
}