// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RAAC Voting Library
 * @author RAAC Protocol Team
 * @notice Core mathematical library for vote-locking mechanics and power calculation
 * @dev Implements Curve-style voting power calculations with time decay
 * Key features:
 * - Time-weighted voting power calculation
 * - Curve-compatible bias and slope formulas
 * - Lock duration validation
 */
library RAACVoting {
    /**
     * @notice Stores voting power data for a specific point in time
     * @dev Uses int128 for Curve compatibility
     */
    struct Point {
        int128 bias;       // Current voting power
        int128 slope;      // Rate of voting power decay
        uint256 timestamp; // Point creation timestamp
    }

    // Constants
    /**
     * @notice Maximum lock duration (4 years)
     * @dev Calculated as 4 * 365 * 86400 seconds
     */
    uint256 public constant MAX_LOCK_TIME = 126144000;

    /**
     * @notice Scaling factor for calculations
     * @dev Used to maintain precision in calculations
     */
    uint256 private constant MULTIPLIER = 10**18;

    /**
     * @notice Maximum value for int128
     * @dev Used for overflow checks in conversions
     */
    int128 private constant MAX_INT128 = 170141183460469231731687303715884105727;

    /**
     * @notice Thrown when amount is zero
     */
    error ZeroAmount();

    /**
     * @notice Thrown when unlock time is invalid
     */
    error InvalidUnlockTime();

    /**
     * @notice Thrown when lock duration exceeds maximum
     */
    error LockDurationTooLong();

    /**
     * @notice Thrown when bias calculation overflows
     */
    error BiasOverflow();

    /**
     * @notice Thrown when slope calculation overflows
     */
    error SlopeOverflow();

    /**
     * @notice Thrown when value is too large for int128
     */
    error ValueTooLargeForInt128();

    /**
     * @notice Calculates voting power bias based on lock amount and duration
     * @dev Implements Curve's bias calculation formula: bias = slope * timeLeft
     * @param amount Amount of tokens being locked
     * @param unlockTime Timestamp when tokens unlock
     * @param currentTime Current timestamp
     * @return Calculated bias value as int128
     */
    function calculateBias(
        uint256 amount,
        uint256 unlockTime,
        uint256 currentTime
    ) public pure returns (int128) {
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= currentTime) revert InvalidUnlockTime();
        if (unlockTime > currentTime + MAX_LOCK_TIME) revert LockDurationTooLong();

        uint256 timeLeft = unlockTime - currentTime;
        int128 slope = calculateSlope(amount);

        // Calculate bias: bias = slope * timeLeft
        // Since slope and timeLeft are positive, casting to int256 is safe
        int256 bias = int256(slope) * int256(timeLeft);
        if (bias < 0 || bias > int256(type(int128).max)) revert BiasOverflow();

        int128 biasResult = int128(bias);
        return biasResult;
    }

    /**
     * @notice Calculates voting power slope based on locked amount
     * @dev Implements Curve's slope calculation formula: slope = amount / MAX_LOCK_TIME
     * @param amount Amount of tokens being locked
     * @return Calculated slope value as int128
     */
    function calculateSlope(uint256 amount) public pure returns (int128) {
        if (amount == 0) revert ZeroAmount();
        
        // Slope = amount / MAX_LOCK_TIME
        uint256 slope = amount / MAX_LOCK_TIME;
        if (slope > uint128(type(int128).max)) revert SlopeOverflow();
        
        return int128(int256(slope));
    }

    /**
     * @notice Safely converts uint256 to int128
     * @dev Includes overflow checks to prevent unsafe conversions
     * @param n Number to convert
     * @return int128 representation of the input
     */
    function safe128(uint256 n) internal pure returns (int128) {
        if (n > uint256(uint128(MAX_INT128))) revert ValueTooLargeForInt128();
        return int128(int256(n));
    }
}
