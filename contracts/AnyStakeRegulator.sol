// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/@defiat-crypto/interfaces/IDeFiatPoints.sol";
import "./interfaces/IAnyStakeRegulator.sol";
import "./interfaces/IAnyStakeVault.sol";
import "./utils/AnyStakeUtils.sol";

//series of pool weighted by token price (using price oracles on chain)
contract AnyStakeRegulator is IAnyStakeRegulator, AnyStakeUtils {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Initialized(address indexed user, address vault);
    event Claim(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PriceMultiplierUpdated(address indexed user, uint256 amount);
    event RegulatorActive(address indexed user, bool active);

    struct UserInfo {
        uint256 amount;
        uint256 rewardPaid;
        uint256 lastEntryBlock;
    }

    mapping (address => UserInfo) public userInfo;
    
    address public vault;

    bool public active;
    bool public initialized;
    uint256 public stakingFee;
    uint256 public priceMultiplier; // pegs price at (DFT_PRICE * priceMultiplier) / 1000
    // uint256 public exponentialRetry; // exponentially increases burn on each successive attempt
    uint256 public lastRewardBlock;
    uint256 public pendingRewards;
    uint256 public rewardsPerShare;
    uint256 public totalShares;

    modifier NoReentrant(address user) {
        require(
            block.number > userInfo[user].lastEntryBlock,
            "Regulator: Must wait 1 block"
        );
        _;
    }

    modifier activated() {
        require(initialized, "Regulator: Not initialized yet");
        _;
    }

    constructor(address _router, address _gov, address _points, address _token) 
        public 
        AnyStakeUtils(_router, _gov, _points, _token)
    {
        priceMultiplier = 1000;
        stakingFee = 100; // 10%
    }

    function initialize(address _vault) external onlyGovernor {
        require(_vault != address(0), "Initialize: Must pass in Vault");
        require(!initialized, "Initialize: Regulator already initialized");

        vault = _vault;
        active = true;
        initialized = true;
        emit Initialized(msg.sender, vault);
    }

    function stabilize(uint256 amount) internal {
        uint256 tokenPrice = IAnyStakeVault(vault).getTokenPrice(DeFiatToken, DeFiatTokenLp);
        uint256 pointsPrice = IAnyStakeVault(vault).getTokenPrice(DeFiatPoints, DeFiatPointsLp);

        if (pointsPrice.mul(priceMultiplier).div(1000) > tokenPrice) {
            // Above Peg: sell DFTP, buy DFT, add to rewards

            IERC20(DeFiatPoints).transfer(vault, amount);
            IAnyStakeVault(vault).buyDeFiatWithTokens(DeFiatPoints, amount);
        } else {
            // Below Peg: sell DFT, buy DFTP, burn proceeds (deflationary)

            IERC20(DeFiatToken).transfer(vault, amount);
            IAnyStakeVault(vault).buyPointsWithTokens(DeFiatToken, amount);
            IDeFiatPoints(DeFiatPoints).overrideLoyaltyPoints(vault, 0);
        }
    }

    // Pool - Update pool rewards, pull from Vault
    function updatePool() external override {
        _updatePool();
    }

    // Pool - Update pool internal
    function _updatePool() internal {
        if (totalShares == 0 || block.number <= lastRewardBlock || !active) {
            return;
        }

        // distribute rewards
        IAnyStakeVault(vault).distributeRewards();

        // update pendingRewards
        uint256 incomingRewards = IERC20(DeFiatToken).balanceOf(address(this)).sub(pendingRewards);
        if (incomingRewards > 0) {
            pendingRewards = pendingRewards.add(incomingRewards);
            // rewardsInThisEpoch = rewardsInThisEpoch.add(incomingRewards);
        }

        // update rewardsPerShare
        rewardsPerShare = rewardsPerShare.add(pendingRewards.mul(1e18).div(totalShares));
        lastRewardBlock = block.number;
    }

    function claim() external override activated NoReentrant(msg.sender) {
        _updatePool();
        _claim(msg.sender);
    }

    // Pool - Claim internal
    function _claim(address _user) internal {
        // get pending rewards
        UserInfo storage user = userInfo[_user];
        uint256 pending = user.amount.mul(rewardsPerShare).div(1e18).sub(user.rewardPaid);
        if (pending == 0) {
            return;
        }

        // don't overflow
        if (pending > pendingRewards) {
            pending = pendingRewards;
        }

        // update pool / user metrics
        pendingRewards = pendingRewards.sub(pending);
        user.rewardPaid = user.amount.mul(rewardsPerShare).div(1e18);
        user.lastEntryBlock = block.number;
        
        // transfer
        safeTokenTransfer(_user, DeFiatToken, pending);
        emit Claim(_user, pending);
    }

    // Pool - Deposit DeFiat Points (DFTP) to earn DFT and stablize token prices
    function deposit(uint256 amount) external override activated NoReentrant(msg.sender) {
        _updatePool();
        _deposit(msg.sender, amount);
    }

    // Pool - deposit internal, perform the stablization
    function _deposit(address _user, uint256 _amount) internal {
        UserInfo storage user = userInfo[_user];
        require(_amount > 0, "Deposit: Cannot deposit zero tokens");

        _claim(_user);

        // update pool / user metrics
        totalShares = totalShares.add(_amount);
        user.amount = user.amount.add(_amount);
        user.rewardPaid = user.rewardPaid.add(_amount);
        user.lastEntryBlock = block.number;

        IERC20(DeFiatPoints).transferFrom(_user, address(this), _amount);
        emit Deposit(_user, _amount);
    }

    // Pool - Withdraw function, currently unused
    function withdraw(uint256 amount) internal NoReentrant(msg.sender) {
        _updatePool();
        _withdraw(msg.sender, amount); // internal, unused
    }

    // Pool - Withdraw internal, unused
    function _withdraw(address _user, uint256 _amount) internal {
        UserInfo storage user = userInfo[_user];
        require(_amount <= user.amount, "Withdraw: Not enough staked");

        _claim(_user);

        totalShares = totalShares.sub(_amount);
        user.amount = user.amount.sub(_amount);
        user.lastEntryBlock = block.number;

        IERC20(DeFiatPoints).transfer(_user, _amount);
        emit Withdraw(_user, _amount);
    }

    // Governance - Set DeFiat Points price multiplier
    function setPriceMultiplier(uint256 _priceMultiplier) external onlyGovernor {
        require(_priceMultiplier != priceMultiplier, "SetMultiplier: No multiplier change");
        require(_priceMultiplier > 0, "SetMultiplier: Must be greater than zero");

        priceMultiplier = _priceMultiplier;
        emit PriceMultiplierUpdated(msg.sender, priceMultiplier);
    }

    // Governance - Set Pool Deposits active
    function setActive(bool _active) external onlyGovernor {
        require(_active != active, "SetActive: No active change");
        
        active = _active;
        emit RegulatorActive(msg.sender, active);
    }
}