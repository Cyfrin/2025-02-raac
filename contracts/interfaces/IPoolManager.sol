// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPoolManager {
    function invest(uint256 amount) external;
    function divest(uint256 amount) external;
    function generateYield() external;
    function getAvailableBalance() external view returns (uint256);
}