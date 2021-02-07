pragma solidity ^0.6.0;

interface IDeFiatToken {
    function _viewFeeRate() external view returns(uint256);
    function _viewBurnRate() external view returns(uint256);
    function _viewFeeDestination() external view returns(address);
    function _viewDiscountOf(address _address) external view returns(uint256);
    function _viewPointsOf(address _address) external view returns(uint256);
}