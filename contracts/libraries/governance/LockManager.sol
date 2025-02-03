// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Lock Manager Library
 * @author RAAC Protocol Team
 * @notice Library for managing token lock positions and related calculations
 * @dev Provides functionality for creating, increasing, extending, and managing token locks
 * Key features:
 * - Lock creation and management
 * - Duration validation
 * - Amount tracking
 * - Lock state queries
 */
library LockManager {
    /**
     * @notice Structure representing a single lock position
     * @dev Stores the lock amount, end time, and existence flag
     */
    struct Lock {
        uint256 amount;    // Amount of tokens locked
        uint256 end;       // Timestamp when lock expires
        bool exists;       // Flag indicating if lock exists
    }

    /**
     * @notice Maximum amount of tokens that can be locked in a single position
     * @dev Set to 10M tokens (with 18 decimals) to prevent excessive concentration
     * This limit applies per lock position and helps maintain system security
     * by preventing individual positions from having too much influence
     *
     * Moved directly to LockState struct
     */
    // uint256 private constant MAX_LOCK_AMOUNT = 10_000_000e18;  // 10M tokens per lock

    /**
     * @notice Structure containing the global state for lock management
     * @dev Maintains mappings and totals for all locks
     */
    struct LockState {
        mapping(address => Lock) locks;      // User lock positions
        uint256 totalLocked;                 // Total amount of tokens locked
        uint256 minLockDuration;            // Minimum allowed lock duration
        uint256 maxLockDuration;            // Maximum allowed lock duration
        uint256 maxTotalLocked;             // Maximum total amount of tokens that can be locked
        uint256 maxLockAmount;             // Maximum amount of tokens that can be locked in a single position
    }

    /**
     * @notice Emitted when a new lock is created
     * @param user Address of the user creating the lock
     * @param amount Amount of tokens being locked
     * @param end Timestamp when the lock expires
     */
    event LockCreated(address indexed user, uint256 amount, uint256 end);

    /**
     * @notice Emitted when additional tokens are added to a lock
     * @param user Address of the user increasing their lock
     * @param additionalAmount Additional amount being locked
     */
    event LockIncreased(address indexed user, uint256 additionalAmount);

    /**
     * @notice Emitted when a lock duration is extended
     * @param user Address of the user extending their lock
     * @param newEnd New expiration timestamp
     */
    event LockExtended(address indexed user, uint256 newEnd);

    /**
     * @notice Emitted when locked tokens are withdrawn
     * @param user Address of the user withdrawing
     * @param amount Amount of tokens withdrawn
     */
    event LockWithdrawn(address indexed user, uint256 amount);

    /**
     * @notice Thrown when lock duration is outside allowed range
     */
    error InvalidLockDuration();

    /**
     * @notice Thrown when lock amount is zero
     */
    error InvalidLockAmount();

    /**
     * @notice Thrown when attempting to modify non-existent lock
     */
    error LockNotFound();

    /**
     * @notice Thrown when attempting to withdraw before lock expiry
     */
    error LockNotExpired();

    /**
     * @notice Thrown when attempting to modify expired lock
     */
    error LockExpired();

    /**
     * @notice Thrown when attempting to increase lock amount beyond the limit
     */
    error AmountExceedsLimit();

    /**
     * @notice Creates a new lock position
     * @dev Validates duration and amount, creates lock entry
     * @param state The lock state storage
     * @param user Address creating the lock
     * @param amount Amount of tokens to lock
     * @param duration Duration of the lock in seconds
     * @return end The timestamp when the lock expires
     */
    function createLock(
        LockState storage state,
        address user,
        uint256 amount,
        uint256 duration
    ) internal returns (uint256 end) {
        // Validation logic remains the same
        if (state.minLockDuration != 0 && state.maxLockDuration != 0) {
            if (duration < state.minLockDuration || duration > state.maxLockDuration) 
                revert InvalidLockDuration();
        }

        if (amount == 0) revert InvalidLockAmount();

        end = block.timestamp + duration;
        
        state.locks[user] = Lock({
            amount: amount,
            end: end,
            exists: true
        });

        state.totalLocked += amount;

        emit LockCreated(user, amount, end);
        return end;
    }

    /**
     * @notice Increases the amount in an existing lock
     * @dev Adds tokens to existing lock without changing duration
     * @param state The lock state storage
     * @param user Address increasing their lock
     * @param additionalAmount Additional amount to lock
     */
    function increaseLock(
        LockState storage state,
        address user,
        uint256 additionalAmount
    ) internal {
        Lock storage lock = state.locks[user];
        if (!lock.exists) revert LockNotFound();
        if (lock.end <= block.timestamp) revert LockExpired();
        
        // Maximum lock amount
        if (lock.amount + additionalAmount > state.maxLockAmount) revert AmountExceedsLimit();
        // Maximum total locked amount
        // if (state.totalLocked + additionalAmount > state.maxTotalLocked) revert AmountExceedsLimit();
        
        lock.amount += additionalAmount;
        state.totalLocked += additionalAmount;

        emit LockIncreased(user, additionalAmount);
    }

    /**
     * @notice Extends the duration of an existing lock
     * @dev Increases lock duration without changing amount
     * @param state The lock state storage
     * @param user Address extending their lock
     * @param extensionDuration New duration in seconds
     * @return newEnd The new expiration timestamp
     */
    function extendLock(
        LockState storage state,
        address user,
        uint256 extensionDuration
    ) internal returns (uint256 newEnd) {
        Lock storage lock = state.locks[user];
        if (!lock.exists) revert LockNotFound();
        if (lock.end <= block.timestamp) revert LockExpired();
        
        // Calculate remaining duration from current lock
        uint256 remainingDuration = lock.end - block.timestamp;
        
        // Calculate total new duration (remaining + extension)
        uint256 totalNewDuration = remainingDuration + extensionDuration;
        
        // Check if total duration exceeds max lock duration
        if (totalNewDuration > state.maxLockDuration) revert InvalidLockDuration();
        
        // Calculate new end time
        newEnd = block.timestamp + totalNewDuration;
        
        // Update lock end time
        lock.end = newEnd;
        emit LockExtended(user, newEnd);
        return newEnd;
    }

    /**
     * @notice Retrieves lock information for an account
     * @dev Returns the full Lock struct for the given address
     * @param self The lock state storage
     * @param account Address to query
     * @return Lock struct containing lock details
     */
    function getLock(
        LockState storage self,
        address account
    ) internal view returns (Lock memory) {
        return self.locks[account];
    }
}
