// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "../interfaces/IAnyStakeMigrator.sol";
import "../AnyStakeRegulator.sol";

contract AnyStakeV2 is IAnyStakeMigrator {

    address public anystake;

    modifier onlyAnyStake {
        require(msg.sender == anystake, "AnyStake: Only previous AnyStake allowed");
        _;
    }

    constructor(address _regulator) public {
        anystake = _regulator;
    }

    function migrateTo(address _user, address _token, uint256 _amount) 
        external
        override
        onlyAnyStake
    {

    }
}