// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/LockManager.sol";

contract LockManagerMock {
    using LockManager for LockManager.LockState;
    
    LockManager.LockState private state;

    function setLockDurations(uint256 min, uint256 max) external {
        state.minLockDuration = min;
        state.maxLockDuration = max;
        // default to 10M
        state.maxLockAmount = 10_000_000 ether;
        state.maxTotalLocked = 10_000_000 ether;
    }

    function createLock(
        address user,
        uint256 amount,
        uint256 duration
    ) external returns (uint256) {
        return state.createLock(user, amount, duration);
    }

    function increaseLock(address user, uint256 additionalAmount) external {
        state.increaseLock(user, additionalAmount);
    }

    function extendLock(address user, uint256 newDuration) external returns (uint256) {
        return state.extendLock(user, newDuration);
    }

    function getLock(address user) external view returns (LockManager.Lock memory) {
        return state.locks[user];
    }

    function getTotalLocked() external view returns (uint256) {
        return state.totalLocked;
    }
}