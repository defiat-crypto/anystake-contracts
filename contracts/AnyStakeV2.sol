// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "./lib/@defiat-crypto/interfaces/IDeFiatPoints.sol";
import "./interfaces/IAnyStake.sol";
import "./interfaces/IAnyStakeMigrator.sol";
import "./interfaces/IAnyStakeVault.sol";
import "./utils/AnyStakeUtils.sol";

contract AnyStakeV2 is IAnyStakeMigrator, IAnyStake, AnyStakeUtils {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // EVENTS
    event Initialized(address indexed user, address vault);
    event Claim(address indexed user, uint256 indexed pid, uint256 amount);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Migrate(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(address indexed user, uint256 indexed pid, address indexed stakedToken, address lpToken, uint256 allocPoints);
    event MigratorUpdated(address indexed user, address migrator);
    event VaultUpdated(address indexed user, address vault);
    event PoolAllocPointsUpdated(address indexed user, uint256 indexed pid, uint256 allocPoints);
    event PoolVipAmountUpdated(address indexed user, uint256 indexed pid, uint256 vipAmount);
    event PoolStakingFeeUpdated(address indexed user, uint256 indexed pid, uint256 stakingFee);
    event PointStipendUpdated(address indexed user, uint256 stipend);

    // STRUCTS
    // UserInfo - User metrics, pending reward = (user.amount * pool.DFTPerShare) - user.rewardDebt
    struct UserInfo {
        uint256 amount; // How many tokens the user has provided.
        uint256 rewardDebt; // Token rewards paid out to user
        uint256 lastRewardBlock; // last pool interaction
    }

    // PoolInfo - Pool metrics
    struct PoolInfo {
        address stakedToken; // Address of staked token contract.
        address lpToken; // uniswap LP token corresponding to the trading pair needed for price calculation
        uint256 totalStaked; // total tokens staked
        uint256 allocPoint; // How many allocation points assigned to this pool. DFTs to distribute per block. (ETH = 2.3M blocks per year)
        uint256 rewardsPerShare; // Accumulated DFTs per share, times 1e18. See below.
        uint256 lastRewardBlock; // last pool update
        uint256 vipAmount; // amount of DFT tokens that must be staked to access the pool
        uint256 stakingFee; // the % withdrawal fee charged. base 1000, 50 = 5%
    }

    address public anystake; // AnyStake V1 contract
    address public migrator; // contract where we may migrate too
    address public vault; // where rewards are stored for distribution
    bool public initialized;

    PoolInfo[] public poolInfo; // array of AnyStake pools
    mapping(uint256 => mapping(address => UserInfo)) public userInfo; // mapping of (pid => (userAddress => userInfo))
    mapping(address => uint256) public pids; // quick mapping for pool ids (staked_token => pid)

    uint256 public lastRewardBlock; // last block the pool was updated
    uint256 public pendingRewards; // pending DFT rewards awaiting anyone to be distro'd to pools
    uint256 public pointStipend; // amount of DFTP awarded per deposit
    uint256 public totalAllocPoint; // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalBlockDelta; // Total blocks since last update
    uint256 public totalEligiblePools; // Amount of pools eligible for rewards

    modifier NoReentrant(uint256 pid, address user) {
        require(
            block.number > userInfo[pid][user].lastRewardBlock,
            "AnyStake: Must wait 1 block"
        );
        _;
    }

    modifier onlyAnyStake {
        require(msg.sender == anystake, "AnyStake: Only previous AnyStake allowed");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "AnyStake: Only Vault allowed");
        _;
    }

    modifier activated() {
        require(initialized, "AnyStake: Not initialized yet");
        _;
    }

    constructor(address _anystake, address _router, address _gov, address _points, address _token) 
        public 
        AnyStakeUtils(_router, _gov, _points, _token)
    {
        anystake = _anystake;
        pointStipend = 1e18;
    }
    
    // Initialize pools/rewards after the Vault has been setup
    function initialize(address _vault) public onlyGovernor {
        require(_vault != address(0), "Initalize: Must pass in Vault");
        require(!initialized, "Initialize: AnyStake already initialized");

        vault = _vault;
        initialized = true;
        emit Initialized(msg.sender, _vault);
    }

    function migrateTo(address _user, address _token, uint256 _amount) 
        external
        override
        onlyAnyStake
    {
        uint256 pid = pids[_token];
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][_user];

        // transfer user stake from AnyStake, do the balance check
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transferFrom(anystake, address(this), _amount);
        uint256 balanceAfter = IERC20(_token).balanceOf(address(this));
        uint256 userDeposit = balanceAfter.sub(balanceBefore);

        // update user / pool metrics
        pool.totalStaked = pool.totalStaked.add(userDeposit);
        user.amount = user.amount.add(userDeposit);
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);
        user.lastRewardBlock = block.number;
    }

    // Pool - Get any incoming rewards, called during Vault.distributeRewards()
    function addReward(uint256 amount) external override onlyVault {
        if (amount == 0) {
            return;
        }

        pendingRewards = pendingRewards.add(amount);
    }

    // Pool - Updates the reward variables of the given pool
    function updatePool(uint256 pid) external {
        _updatePool(pid);
    }

    // Pool - Update internal
    function _updatePool(uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.totalStaked == 0 || pool.lastRewardBlock >= block.number || pool.allocPoint == 0) {
            return;
        }

        // calculate total reward blocks since last update call
        if (lastRewardBlock < block.number) {
            totalBlockDelta = totalBlockDelta.add(block.number.sub(lastRewardBlock).mul(totalEligiblePools));
            lastRewardBlock = block.number;
        }

        // calculate rewards, returns if already done this block
        IAnyStakeVault(vault).calculateRewards();        

        // Calculate pool's share of pending rewards 
        // find blocks passed since last update for this pool
        uint256 poolBlockDelta = block.number.sub(pool.lastRewardBlock);
        // find the pending relative to blocks passed
        uint256 blockRewards = pendingRewards.mul(poolBlockDelta).div(totalBlockDelta);
        // find the pending relative to alloc points
        uint256 allocRewards = pendingRewards.mul(pool.allocPoint).div(totalAllocPoint);
        // find the weighted average of pending rewards
        uint256 poolRewards = blockRewards.add(allocRewards).div(2);
        
        // update reward variables
        totalBlockDelta = poolBlockDelta > totalBlockDelta ? 0 : totalBlockDelta.sub(poolBlockDelta);
        pendingRewards = poolRewards > pendingRewards ? 0 : pendingRewards.sub(poolRewards);
        
        // update pool variables
        pool.rewardsPerShare = pool.rewardsPerShare.add(poolRewards.mul(1e18).div(pool.totalStaked));
        pool.lastRewardBlock = block.number;
    }

    // Pool - Claim rewards
    function claim(uint256 pid) external override NoReentrant(pid, msg.sender) {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];

        _updatePool(pid);
        _claim(pid, msg.sender);

        // set user metrics, reward block
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);
        user.lastRewardBlock = block.number;
    }

    // Pool - Claim internal, called during deposit() and withdraw()
    function _claim(uint256 _pid, address _user) internal {
        uint256 rewards = pending(_pid, _user);
        // transfer DFT rewards from Vault
        if (rewards != 0) {
            IAnyStakeVault(vault).distributeRewards(_user, rewards);
        }

        emit Claim(_user, _pid, rewards);
    }

    // Pool - Deposit Tokens
    function deposit(uint256 pid, uint256 amount) external override NoReentrant(pid, msg.sender) {
        _deposit(msg.sender, pid, amount);
    }

    // Pool - Deposit internal
    function _deposit(address _user, uint256 _pid, uint256 _amount) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        require(_amount > 0, "Deposit: Cannot deposit zero tokens");
        require(pool.allocPoint > 0, "Deposit: Pool is not active");
        require(pool.vipAmount <= userInfo[0][_user].amount, "Deposit: VIP Only");

        // Update and claim rewards
        _updatePool(_pid);
        _claim(_pid, _user);

        // if this pool was empty and receives a deposit, and it is not the first deposit:
        if (pool.totalStaked == 0 && pool.rewardsPerShare != 0) {
            // re-add the pool to eligible calculation
            totalEligiblePools = totalEligiblePools.add(1);
            // reset the reward block
            pool.lastRewardBlock = block.number;
        }

        // Get tokens from user, balance check to support Fee-On-Transfer tokens
        uint256 amountBefore = IERC20(pool.stakedToken).balanceOf(address(this));
        IERC20(pool.stakedToken).safeTransferFrom(_user, address(this), _amount);
        uint256 amountAfter = IERC20(pool.stakedToken).balanceOf(address(this));
        uint256 amount = amountAfter.sub(amountBefore);

        // Finalize, update user metrics
        pool.totalStaked = pool.totalStaked.add(amount);
        user.amount = user.amount.add(amount);
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);
        user.lastRewardBlock = block.number;
        
        // reward user
        IDeFiatPoints(DeFiatPoints).addPoints(_user, IDeFiatPoints(DeFiatPoints).viewTxThreshold(), pointStipend);

        // Transfer the total amounts from user and update pool user.amount into the AnyStake contract
        emit Deposit(_user, _pid, amount);
    }

    // Pool - Withdraw staked tokens
    function withdraw(uint256 pid, uint256 amount) external override NoReentrant(pid, msg.sender) {
        _withdraw(msg.sender, pid, amount);
    }
    
    // Pool - Withdraw Internal
    function _withdraw(
        address _user,
        uint256 _pid,
        uint256 _amount
    ) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        require(_amount > 0, "Withdraw: amount must be greater than zero");
        require(user.amount >= _amount, "Withdraw: user amount insufficient");
        require(pool.vipAmount <= userInfo[0][_user].amount, "Withdraw: VIP Only");
        
        // claim rewards
        _updatePool(_pid);
        _claim(_pid, _user);

        // update pool / user metrics
        pool.totalStaked = pool.totalStaked.sub(_amount);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);
        user.lastRewardBlock = block.number;

        // reduce eligible pools only if done by user actions
        if (pool.totalStaked == 0 && pool.allocPoint > 0) {
            totalEligiblePools = totalEligiblePools.sub(1);
        }

        // find the staking fee amount
        uint256 stakingFeeAmount = _amount.mul(pool.stakingFee).div(1000);
        // get user's remaining shares after fee
        uint256 remainingUserAmount = _amount.sub(stakingFeeAmount);

        if(stakingFeeAmount > 0){
            // Send Fee to Vault and buy DFT, balance check to support Fee-On-Transfer tokens
            uint256 balanceBefore = IERC20(pool.stakedToken).balanceOf(vault);
            safeTokenTransfer(vault, pool.stakedToken, stakingFeeAmount);
            uint256 balanceAfter = IERC20(pool.stakedToken).balanceOf(vault);
            uint256 balance = balanceAfter.sub(balanceBefore);
            // perform the buyback
            IAnyStakeVault(vault).buyDeFiatWithTokens(pool.stakedToken, balance);
        }

        // withdraw user tokens
        safeTokenTransfer(_user, pool.stakedToken, remainingUserAmount);        
        emit Withdraw(_user, _pid, remainingUserAmount);
    }

    // Pool - migrate stake to a new contract, should only be called after 
    function migrate(uint256 pid) external NoReentrant(pid, msg.sender) {
        _migrate(msg.sender, pid);
    }

    // Pool - migrate internal
    function _migrate(address _user, uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 balance = user.amount;

        require(migrator != address(0), "Migrate: No migrator set");
        require(balance > 0, "Migrate: No tokens to migrate");
        require(pool.allocPoint == 0, "Migrate: Pool is still active");

        _claim(_pid, _user);

        IERC20(pool.stakedToken).safeApprove(migrator, balance);
        IAnyStakeMigrator(migrator).migrateTo(_user, pool.stakedToken, balance);
        emit Migrate(_user, _pid, balance);
    }

    // Pool - withdraw all stake and forfeit rewards, skips pool update
    function emergencyWithdraw(uint256 pid) external NoReentrant(pid, msg.sender) {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        require(user.amount > 0, "EmergencyWithdraw: user amount insufficient");
        
        // find the fee amount and remaining user share
        uint256 stakingFeeAmount = user.amount.mul(pool.stakingFee).div(1000);
        uint256 remainingUserAmount = user.amount.sub(stakingFeeAmount);
        // update pool / user metrics
        pool.totalStaked = pool.totalStaked.sub(user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
        user.lastRewardBlock = block.number;

        // remove pool from eligibility calculations
        if (pool.totalStaked == 0 && pool.allocPoint > 0) {
            totalEligiblePools = totalEligiblePools.sub(1);
        }

        // transfer vault the fee for admins to perform buyback, send user share
        safeTokenTransfer(vault, pool.stakedToken, stakingFeeAmount);
        safeTokenTransfer(msg.sender, pool.stakedToken, remainingUserAmount);
        emit EmergencyWithdraw(msg.sender, pid, remainingUserAmount);
    }

    // View - gets stakedToken price from the Vault
    function getPrice(uint256 pid) external view returns (uint256) {
        address token = poolInfo[pid].stakedToken;
        address lpToken = poolInfo[pid].lpToken;

        return IAnyStakeVault(vault).getTokenPrice(token, lpToken);
    }

    // View - Pending DFT Rewards for user in pool
    function pending(uint256 _pid, address _user)
        public
        view
        returns (uint256)
    {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];

        // not sure if this will work with tokens non-1e18 decimals
        return user.amount.mul(pool.rewardsPerShare).div(1e18).sub(user.rewardDebt);
    }

    // View - View Pool Length
    function poolLength() external view returns (uint256) {
        return poolInfo.length; // number of pools (pids)
    }

    // Governance - Add Multiple Token Pools
    function addPoolBatch(
        address[] calldata tokens,
        address[] calldata lpTokens,
        uint256[] calldata allocPoints,
        uint256[] calldata vipAmounts,
        uint256[] calldata stakingFees
    ) external onlyGovernor {
        for (uint i = 0; i < tokens.length; i++) {
            _addPool(tokens[i], lpTokens[i], allocPoints[i], vipAmounts[i], stakingFees[i]);
        }
    }

    // Governance - Add Single Token Pool
    function addPool(
        address token,
        address lpToken, 
        uint256 allocPoint,
        uint256 vipAmount,
        uint256 stakingFee
    ) external onlyGovernor {
        _addPool(token, lpToken, allocPoint, vipAmount, stakingFee);
    }

    // Governance - Add Token Pool Internal
    function _addPool(
        address stakedToken,
        address lpToken,
        uint256 allocPoint,
        uint256 vipAmount,
        uint256 stakingFee
    ) internal {
        require(pids[stakedToken] == 0, "AddPool: Token pool already added");

        // update block delta, can be called mutiple times in one block
        if (lastRewardBlock != 0) {
            totalBlockDelta = totalBlockDelta.add(
                block.number.sub(lastRewardBlock).mul(totalEligiblePools)
            );
        }

        // update reward block
        lastRewardBlock = block.number;
        // add token to pids
        pids[stakedToken] = poolInfo.length;
        // stakedToken now non-withrawable by admins
        _blacklistedAdminWithdraw[stakedToken] = true;
        // update total pool points
        totalAllocPoint = totalAllocPoint.add(allocPoint);
        // update eligible pools to factor into block delta
        totalEligiblePools = totalEligiblePools.add(1);

        // Add new pool
        poolInfo.push(
            PoolInfo({
                stakedToken: stakedToken,
                lpToken: lpToken,
                allocPoint: allocPoint,
                lastRewardBlock: block.number,
                totalStaked: 0,
                rewardsPerShare: 0,
                vipAmount: vipAmount,
                stakingFee: stakingFee
            })
        );

        emit PoolAdded(msg.sender, pids[stakedToken], stakedToken, lpToken, allocPoint);
    }

    // Governance - Set Migrator
    function setMigrator(address _migrator) external onlyGovernor {
        require(_migrator != address(0), "SetMigrator: No migrator change");

        migrator = _migrator;
        emit MigratorUpdated(msg.sender, _migrator);
    }

    // Governance - Set Vault
    function setVault(address _vault) external onlyGovernor {
        require(_vault != address(0), "SetVault: No migrator change");

        vault = _vault;
        emit VaultUpdated(msg.sender, vault);
    }

    // Governance - Set Pool Allocation Points, generally should be called withUpdate = true
    function setPoolAllocPoints(uint256 _pid, uint256 _allocPoint, bool withUpdate) external onlyGovernor {
        PoolInfo storage pool = poolInfo[_pid];
        require(pool.allocPoint != _allocPoint, "SetAllocPoints: No points change");

        // update the pool on set points
        if (withUpdate) {
            _updatePool(_pid);
        }

        // if we are making the pool inactive
        if (_allocPoint == 0 && pool.totalStaked != 0) {
            totalEligiblePools = totalEligiblePools.sub(1);
        }

        // if we are reactivating the pool
        if (pool.allocPoint == 0) {
            totalBlockDelta = totalBlockDelta.add(block.number.sub(lastRewardBlock).mul(totalEligiblePools));
            lastRewardBlock = block.number;
            totalEligiblePools = totalEligiblePools.add(1);
        }

        // update alloc points
        totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(_allocPoint);
        pool.allocPoint = _allocPoint;
        emit PoolAllocPointsUpdated(msg.sender, _pid, _allocPoint);
    }

    // Governance - Set Pool Charge Fee
    function setPoolVipAmount(uint256 _pid, uint256 _vipAmount) external onlyGovernor {
        require(poolInfo[_pid].vipAmount != _vipAmount, "SetVipAmount: No amount change");

        poolInfo[_pid].vipAmount = _vipAmount;
        emit PoolVipAmountUpdated(msg.sender, _pid, _vipAmount);
    }

    // Governance - Set Pool Charge Fee
    function setPoolChargeFee(uint256 _pid, uint256 _stakingFee) external onlyGovernor {
        require(_stakingFee != poolInfo[_pid].stakingFee, "SetStakingFee: No fee change");
        require(_stakingFee <= 1000, "SetFee: Fee cannot exceed 100%");

        poolInfo[_pid].stakingFee = _stakingFee;
        emit PoolStakingFeeUpdated(msg.sender, _pid, _stakingFee);
    }

    // Governance - Set Pool Allocation Points
    function setPointStipend(uint256 _pointStipend) external onlyGovernor {
        require(_pointStipend != pointStipend, "SetStipend: No stipend change");

        pointStipend = _pointStipend;
        emit PointStipendUpdated(msg.sender, pointStipend);
    }
}
