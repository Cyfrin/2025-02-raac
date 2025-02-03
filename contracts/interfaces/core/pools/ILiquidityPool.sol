// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILiquidityPool {
    function addMarket(address _pairedToken) external;
    function removeMarket(address _pairedToken) external;
    function addLiquidity(address _pairedToken, uint256 raacAmount, uint256 pairedAmount, uint256 minLPAmount) external;
    function removeLiquidity(address _pairedToken, uint256 lpAmount, uint256 minRaacAmount, uint256 minPairedAmount) external;
    function getMarkets() external view returns (address[] memory);
    function getTotalLiquidity(address _pairedToken) external view returns (uint256 raacLiquidity, uint256 pairedLiquidity);
    function getUserLiquidity(address _pairedToken, address _user) external view returns (uint256 raacLiquidity, uint256 pairedLiquidity, uint256 lpAmount);
    function getExchangeRate(address _pairedToken) external view returns (uint256 raacPerPaired, uint256 pairedPerRaac);
    function getTotalValueLocked() external view returns (uint256 tvl);
}