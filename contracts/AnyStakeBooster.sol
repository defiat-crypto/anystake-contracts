// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/@defiat-crypto/interfaces/IDeFiatPoints.sol";
import "./lib/@openzeppelin/math/Math.sol";
import "./interfaces/IAnyStakeMigrator.sol";
import "./interfaces/IAnyStakeBooster.sol";
import "./utils/AnyStakeUtils.sol";

// Pool that timelocks DFT in exchange for yield boost in AnyStake/Regulator
contract AnyStakeBooster is IAnyStakeBooster, AnyStakeUtils {
    using SafeMath for uint256;

    struct UserInfo {
        uint256 amount;
        uint256 lockTime;
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    uint128 public lockTime;
    uint128 public boostMultiplier;
    uint256 public upperBound;
    uint256 public lowerBound;

    address public king;
    mapping (address => bool) public knights;
    mapping (address => UserInfo) public userInfo;

    constructor(address _router, address _gov, address _points, address _token) 
        public 
        AnyStakeUtils(_router, _gov, _points, _token)
    {
        lockTime = 1209600; // 2 weeks
        boostMultiplier = 5; // 0.005 %
    }

    function viewBoost(address user) external view override returns (uint256) {
        if (user == king) {
            return 200; // 4x
        } else if (knights[user]) {
            return 150; // 3x
        } else {
            return Math.min(userInfo[user].amount * boostMultiplier / 1000, 100); // up to 2x
        }
    }

    function viewLockTime(address user) external view override returns (uint256) {
        return userInfo[user].lockTime;
    }

    function viewRankEligibility(address user) external view returns (uint128) {
        UserInfo memory _user = userInfo[user];
        if (_user.amount > upperBound) {
            return 2;
        } else if (_user.amount > lowerBound) {
            return 1;
        } else {
            return 0;
        }
    }

    function claimRank() external {

    }

    function deposit(uint256 amount) external override {
        _deposit(msg.sender, amount);
        // IAnyStake(anystake).claimAll();
        // IAnyStakeRegulator(regulator).claim();
            // IAnyStake(anystake).updateShares();
            // IAnyStakeRegulator(regulator).updateShares();
    }

    function _deposit(address _user, uint256 _amount) internal {
        require(_amount > 0, "Deposit: Cannot deposit zero token");

        UserInfo storage user = userInfo[_user];
        user.amount = user.amount.add(_amount); // add amount
        user.lockTime = block.timestamp + lockTime; // reset lock time

        if (user.amount > upperBound) {
            king = _user;
            upperBound = user.amount;

            // 
        } else if (user.amount > lowerBound) {
            knights[_user] = true;
            // totalKnights += 1;
        }

        IERC20(DeFiatToken).transferFrom(_user, address(this), _amount);
        emit Deposit(_user, _amount);
    }

    function withdraw(uint256 amount) external override {
        _withdraw(msg.sender, amount);
        // IAnyStake(anystake).claimAll();
        // IAnyStakeRegulator(regulator).claim();
    }

    function _withdraw(address _user, uint256 _amount) internal {
        UserInfo storage user = userInfo[_user];
        require(user.amount >= _amount, "Withdraw: Not enough tokens");
        require(user.lockTime < block.timestamp, "Withdraw: Lock time not expired");

        if (_user == king) {
            king = address(0);
            // upperBound = 1000e18;
        } else if (knights[_user]) {
            // 
        }

        user.amount = user.amount.sub(_amount);
        safeTokenTransfer(_user, DeFiatToken, _amount);
        emit Withdraw(_user, _amount);
    }
}