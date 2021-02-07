pragma solidity ^0.6.0;

interface IAnyStake {
    function massUpdatePools() external;
    function startNewEpoch() external;
    function claim(uint256 pid) external;
    function claimAll() external;
    function deposit(uint256 pid, uint256 amount) external;
    function withdraw(uint256 pid, uint256 amount) external;
}