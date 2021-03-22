// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "../interfaces/IAnyStakeMigrator.sol";
import "../AnyStakeRegulator.sol";

contract RegulatorV2 is IAnyStakeMigrator {

    address public regulator;

    modifier onlyRegulator {
        require(msg.sender == regulator, "Regulator: Only previous Regulator allowed");
        _;
    }

    constructor(address _regulator) public {
        regulator = _regulator;
    }

    function migrateTo(address _user, address _token, uint256 _amount) 
        external 
        override 
        onlyRegulator 
    {

    }
}