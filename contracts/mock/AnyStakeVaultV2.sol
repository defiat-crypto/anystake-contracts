// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "../interfaces/IVaultMigrator.sol";
import "../AnyStakeVault.sol";

contract AnyStakeVaultV2 is IVaultMigrator {

    // remove this in complete implementation
    address public constant DeFiatToken = address(0xB6eE603933E024d8d53dDE3faa0bf98fE2a3d6f1);

    address public vault; // previous vault

    uint256 public bondedRewards; // DFT bonded (block-based) rewards
    uint256 public bondedRewardsPerBlock; // Amt of bonded DFT paid out each block
    uint256 public bondedRewardsBlocksRemaining; // Remaining bonding period
    uint256 public distributionRate; // % of rewards which are sent to AnyStake
    uint256 public lastDistributionBlock; // last block that rewards were distributed
    uint256 public totalBuybackAmount; // total DFT bought back
    uint256 public totalRewardsDistributed; // total rewards distributed from Vault
    uint256 public pendingRewards; // total rewards pending claim

    modifier onlyVault {
        require(msg.sender == vault, "Vault: Only previous Vault allowed");
        _;
    }

    constructor(address _vault) public {
        vault = _vault;
    }

    // migrate to the new Vault, keeping reward variables in tact. Reset distribution and buyback amounts.
    function migrateTo() external override onlyVault {
        // bonded rewards
        bondedRewards = AnyStakeVault(vault).bondedRewards();
        bondedRewardsBlocksRemaining = AnyStakeVault(vault).bondedRewardsBlocksRemaining();
        bondedRewardsPerBlock = AnyStakeVault(vault).bondedRewardsPerBlock();

        // pending rewards
        pendingRewards = AnyStakeVault(vault).pendingRewards();

        // distribution vars
        lastDistributionBlock = AnyStakeVault(vault).lastDistributionBlock();
        distributionRate = AnyStakeVault(vault).distributionRate();

        // get the tokens
        IERC20(DeFiatToken).transferFrom(vault, address(this), IERC20(DeFiatToken).balanceOf(vault));
    }
}