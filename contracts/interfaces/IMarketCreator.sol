// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMarketCreator {
    function createMarket(address _quoteAsset, uint256 _lockDuration, uint256 _reward) external;
    function participateInMarket(uint256 marketId, uint256 amount) external;
    function redeemFromMarket(uint256 marketId) external;
    function getMarketInfo(uint256 marketId) external view returns (address, uint256, uint256, uint256);
    function getUserPosition(uint256 marketId, address user) external view returns (uint256, uint256, bool);
}