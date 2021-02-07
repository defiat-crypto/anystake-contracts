// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../@openzeppelin/token/ERC20/IERC20.sol";
import "../../@openzeppelin/access/Ownable.sol";

abstract contract DeFiatUtils is Ownable {
    event TokenSweep(address indexed user, address indexed token, uint256 amount);

    mapping (address => bool) private _unsweepable; // mapping of tokens that admins cannot withdraw

    // Sweep any tokens/ETH accidentally sent or airdropped to the contract
    function sweep(address token) external onlyOwner {
        uint256 amount = IERC20(token).balanceOf(address(this));
        require(amount > 0, "Sweep: No token balance");

        IERC20(token).transfer(msg.sender, amount); // use of the ERC20 traditional transfer

        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }

        emit TokenSweep(msg.sender, token, amount);
    }

    // 
    function unsweepable(address _token)
        public
        view
        returns (bool)
    {
        return _unsweepable[_token];
    }



    // Self-Destruct contract to free space on-chain, sweep any ETH to owner
    function kill() external onlyOwner {
        selfdestruct(payable(msg.sender));
    }
}