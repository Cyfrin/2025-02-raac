// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IveRAACDistributor {
    function authorizePool(address pool) external;
    function distributeRewards(address user, uint256 amount) external;
    function updateRewards(address user) external;
    function calculateReward(uint256 amount) external pure returns (uint256);
    function getPendingRewards(address user) external view returns (uint256);
    function claimRewards() external;
}