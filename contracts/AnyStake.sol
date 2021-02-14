// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/@defiat-crypto/interfaces/IDeFiatPoints.sol";
import "./interfaces/IAnyStake.sol";
import "./interfaces/IAnyStakeMigrator.sol";
import "./interfaces/IAnyStakeVault.sol";
import "./utils/AnyStakeUtils.sol";
import "hardhat/console.sol";

//series of pool weighted by token price (using price oracles on chain)
contract AnyStake is IAnyStake, AnyStakeUtils {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // EVENTS
    event Initialized(address indexed user, address vault);
    event EpochStarted(address indexed user, uint256 epoch, uint256 epochStartBlock, uint256 cumulativeRewardsSinceStart);
    event Claim(address indexed user, uint256 indexed pid, uint256 amount);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Migrate(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(address indexed user, uint256 indexed pid, address indexed stakedToken, address lpToken, uint256 allocPoints);
    event MigratorUpdated(address indexed user, address migrator);
    event PoolAllocPointsUpdated(address indexed user, uint256 indexed pid, uint256 allocPoints);
    event PoolActiveUpdated(address indexed user, uint256 indexed pid, bool active);
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
        bool active; // whether pool is accepting deposits (default = true)
    }

    address public migrator; // contract where we may migrate too
    address public vault; // where rewards are stored for distribution
    bool public initialized;

    PoolInfo[] public poolInfo; // array of AnyStake pools
    mapping(uint256 => mapping(address => UserInfo)) public userInfo; // mapping of (pid => (userAddress => userInfo))
    mapping(uint256 => uint256) public epochRewards; // For easy graphing historical epoch rewards
    mapping(uint256 => bool) public poolUpdates; // mapping of block number to pool update
    mapping(address => uint256) public pids; // quick mapping for pool ids (staked_token => pid)

    uint256 public stakingFee; // fee to stake ERC-20 tokens
    uint256 public lastRewardBlock; // last block the pool was updated
    uint256 public pendingRewards; // pending DFT rewards awaiting anyone to be distro'd to pools
    uint256 public pointStipend; // amount of DFTP awarded per deposit
    uint256 public totalAllocPoint; // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalBlockDelta; // Total blocks since last update

    uint256 public contractStartBlock;
    uint256 public epochCalculationStartBlock;
    uint256 public cumulativeRewardsSinceStart;
    uint256 public rewardsInThisEpoch;
    uint256 public epoch;

    modifier NoReentrant(uint256 pid, address user) {
        require(
            block.number > userInfo[pid][user].lastRewardBlock,
            "AnyStake: Must wait 1 block"
        );
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

    constructor(address _router, address _gov, address _points, address _token) 
        public 
        AnyStakeUtils(_router, _gov, _token, _points)
    {
        pointStipend = 1e18;
        stakingFee = 50; // 5%, base 100
    }
    
    // Initialize pools/rewards after the Vault has been setup
    function initialize(address _vault) public onlyGovernor {
        require(_vault != address(0), "Initalize: Must pass in Vault");
        require(!initialized, "Initialize: AnyStake already initialized");

        vault = _vault;
        contractStartBlock = block.number;
        epochCalculationStartBlock = block.number;
        initialized = true;
        emit Initialized(msg.sender, _vault);
    }

    // Rewards - View Returns fees generated since start of this contract, DFT only
    function averageFeesPerBlockSinceStart()
        external
        view
        returns (uint256 averagePerBlock)
    {
        averagePerBlock = cumulativeRewardsSinceStart
            .add(rewardsInThisEpoch)
            .div(block.number.sub(contractStartBlock));
    }

    // Rewards - Returns averge fees in this epoch, DFT only
    function averageFeesPerBlockEpoch()
        external
        view
        returns (uint256 averagePerBlock)
    {
        averagePerBlock = rewardsInThisEpoch.div(
            block.number.sub(epochCalculationStartBlock)
        );
    }

    // Rewards - Starts a new calculation epoch, return if too soon
    // 50k blocks = About a week
    function startNewEpoch() public override {
        if (epochCalculationStartBlock + 50000 < block.number) {
            return;
        }

        epochRewards[epoch] = rewardsInThisEpoch;
        cumulativeRewardsSinceStart = cumulativeRewardsSinceStart.add(rewardsInThisEpoch);
        rewardsInThisEpoch = 0;
        epochCalculationStartBlock = block.number;
        epoch++;
        emit EpochStarted(msg.sender, epoch, epochCalculationStartBlock, cumulativeRewardsSinceStart);
    }

    // Pool - Get any incoming rewards, called during Vault.distributeRewards()
    function addReward(uint256 amount) external override onlyVault {
        if (amount == 0) {
            return;
        }

        pendingRewards = pendingRewards.add(amount);
        rewardsInThisEpoch = rewardsInThisEpoch.add(amount);
    }

    // Pool - Mass Update all pools, start new epoch if available
    function massUpdatePools() external override {
        startNewEpoch(); // try to start a new rewards epoch

        // calculate updated rewards
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; pid++) {
            _updatePool(pid);
        }
    }

    // Pool - Updates the reward variables of the given pool
    function updatePool(uint256 pid) external {
        _updatePool(pid);
    }

    // Pool - Update internal
    function _updatePool(uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.totalStaked == 0 || pool.lastRewardBlock >= block.number || !pool.active) {
            return;
        }

        // calculate total reward blocks since last update call
        uint256 blockDelta = block.number.sub(lastRewardBlock);
        if (poolUpdates[block.number] == false) {
            totalBlockDelta = totalBlockDelta.add(blockDelta.mul(poolInfo.length));
            poolUpdates[block.number] = true;
        }

        // pull rewards, returns if already done this block
        IAnyStakeVault(vault).distributeRewards();        

        // Calculate pool's share of pending rewards, using blocks since last reward and alloc points
        uint256 poolBlockDelta = block.number.sub(pool.lastRewardBlock);
        uint256 poolRewards = pendingRewards
            .mul(poolBlockDelta)
            .div(totalBlockDelta)
            .mul(pool.allocPoint)
            .div(totalAllocPoint);
        
        // double-check math since tokenSupply is not necessarily 1e18
        totalBlockDelta = totalBlockDelta.sub(poolBlockDelta);
        pendingRewards = pendingRewards.sub(poolRewards);
        lastRewardBlock = block.number;
        pool.rewardsPerShare = pool.rewardsPerShare.add(poolRewards.mul(1e18).div(pool.totalStaked));
        pool.lastRewardBlock = block.number;
    }

    // Pool - Claim from all pools
    function claimAll() external override {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; pid++) {
            // update and claim if user hasnt updated this block and has a stake
            if (block.number > userInfo[pid][msg.sender].lastRewardBlock
                && userInfo[pid][msg.sender].amount > 0
            ) {
                _updatePool(pid);
                _claim(pid, msg.sender);
            }
        }  
    }

    // Pool - Claim rewards
    function claim(uint256 pid) external override NoReentrant(pid, msg.sender) {
        _updatePool(pid);
        _claim(pid, msg.sender);
    }

    // Pool - Claim internal, called during deposit() and withdraw()
    function _claim(uint256 _pid, address _user) internal {
        UserInfo storage user = userInfo[_pid][_user];

        uint256 rewards = pending(_pid, _user);
        if (rewards == 0) {
            return;
        }

        // update pool / user metrics
        user.rewardDebt = user.amount.mul(poolInfo[_pid].rewardsPerShare).div(1e18);
        user.lastRewardBlock = block.number;

        // transfer DFT rewards
        safeTokenTransfer(_user, DeFiatToken, rewards);
        emit Claim(_user, _pid, rewards);
    }

    // Pool - Deposit Tokens
    function deposit(uint256 pid, uint256 amount) external override NoReentrant(pid, msg.sender) {
        _updatePool(pid);
        _deposit(msg.sender, pid, amount);
    }

    // Pool - Deposit internal
    function _deposit(address _user, uint256 _pid, uint256 _amount) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        require(_amount > 0, "Deposit: Cannot deposit zero tokens");
        require(pool.active, "Deposit: Pool is not active");

        // Claim rewards
        _claim(_pid, _user);

        // Get tokens from user
        IERC20(pool.stakedToken).safeTransferFrom(_user, address(this), _amount);
    
        // Finalize, update user metrics
        pool.totalStaked = pool.totalStaked.add(_amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);

        // reward user
        IDeFiatPoints(DeFiatPoints).addPoints(_user, IDeFiatPoints(DeFiatPoints).viewTxThreshold(), pointStipend);

        // Transfer the total amounts from user and update pool user.amount into the AnyStake contract
        emit Deposit(_user, _pid, _amount);
    }

    // Pool - Withdraw staked tokens
    function withdraw(uint256 pid, uint256 amount) external override NoReentrant(pid, msg.sender) {
        _updatePool(pid);
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
        
        // claim rewards
        _claim(_pid, _user);

        // update pool / user metrics
        pool.totalStaked = pool.totalStaked.sub(_amount);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.rewardsPerShare).div(1e18);

        // PID = 0 : DFT-LP
        // PID = 1 : DFTP-LP
        // PID = 2 : weth (price = 1e18)
        // PID > 2 : all other tokens
        // No fee on DFT-ETH, DFTP-ETH pools
        uint256 stakingFeeAmount = _pid >= 2 ? _amount.mul(stakingFee).div(1000) : 0; 
        uint256 remainingUserAmount = _amount.sub(stakingFeeAmount);

        if(stakingFeeAmount > 0){
            // Send Fee to Vault and buy DFT
            safeTokenTransfer(vault, pool.stakedToken, stakingFeeAmount);
            IAnyStakeVault(vault).buyDeFiatWithTokens(pool.stakedToken, stakingFeeAmount);
        }

        // withdraw user tokens
        safeTokenTransfer(_user, pool.stakedToken, remainingUserAmount);        
        emit Withdraw(_user, _pid, remainingUserAmount);
    }

    function migrate(uint256 pid) external NoReentrant(pid, msg.sender) {
        _updatePool(pid);
        _migrate(msg.sender, pid);
    }

    function _migrate(address _user, uint256 _pid) internal {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 balance = user.amount;

        require(migrator != address(0), "Migrate: No migrator set");
        require(balance > 0, "Migrate: No tokens to migrate");

        IERC20(pool.stakedToken).safeApprove(migrator, balance);
        IAnyStakeMigrator(migrator).migrate(_user, pool.stakedToken, balance);
        emit Migrate(_user, _pid, balance);
    }

    // 
    function emergencyWithdraw(uint256 pid) external NoReentrant(pid, msg.sender) {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];

        require(user.amount > 0, "EmergencyWithdraw: user amount insufficient");

        uint256 balance = user.amount;
        pool.totalStaked = pool.totalStaked.sub(balance);
        user.amount = 0;
        user.rewardDebt = 0;
        user.lastRewardBlock = block.number;

        safeTokenTransfer(msg.sender, pool.stakedToken, balance);
        emit EmergencyWithdraw(msg.sender, pid, balance);
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
        uint256[] calldata allocPoints
    ) external onlyGovernor {
        for (uint i = 0; i < tokens.length; i++) {
            _addPool(tokens[i], lpTokens[i], allocPoints[i]);
        }
    }

    // Governance - Add Single Token Pool
    function addPool(
        address token, 
        address lpToken, 
        uint256 allocPoint
    ) external onlyGovernor {
        _addPool(token, lpToken, allocPoint);
    }

    // Governance - Add Token Pool Internal
    function _addPool(
        address stakedToken,
        address lpToken,
        uint256 allocPoint
    ) internal {
        require(pids[stakedToken] == 0, "AddPool: Token pool already added");

        pids[stakedToken] = poolInfo.length;
        _blacklistedAdminWithdraw[stakedToken] = true; // stakedToken now non-withrawable by admins
        totalAllocPoint = totalAllocPoint.add(allocPoint);

        // Add new pool
        poolInfo.push(
            PoolInfo({
                stakedToken: stakedToken,
                lpToken: lpToken,
                allocPoint: allocPoint,
                lastRewardBlock: block.number,
                totalStaked: 0,
                rewardsPerShare: 0,
                active: true
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

    // Governance - Set Pool Allocation Points, must update to maintain reward consistency
    function setPoolAllocPoints(uint256 _pid, uint256 _allocPoint) external onlyGovernor {
        _updatePool(_pid);
        require(poolInfo[_pid].allocPoint != _allocPoint, "SetAllocPoints: No points change");

        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        emit PoolAllocPointsUpdated(msg.sender, _pid, _allocPoint);
    }

    // Governance - Set Pool Active for Deposits, must update to maintain reward consistency
    function setPoolActive(uint256 _pid, bool _active) external onlyGovernor {
        _updatePool(_pid);
        require(poolInfo[_pid].active != _active, "SetActive: No pool change");

        poolInfo[_pid].active = _active;
        emit PoolActiveUpdated(msg.sender, _pid, _active);
    }

    // Governance - Set Pool Allocation Points
    function setPointStipend(uint256 _pointStipend) external onlyGovernor {
        require(_pointStipend != pointStipend, "SetStipend: No stipend change");

        pointStipend = _pointStipend;
        emit PointStipendUpdated(msg.sender, pointStipend);
    }
}
