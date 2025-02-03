// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../governance/RAACVoting.sol";
import "../math/TimeWeightedAverage.sol";
import "../governance/Checkpoints.sol";

/**
 * @title Voting Power Library
 * @author RAAC Protocol Team
 * @notice Library for handling voting power calculations and checkpoints in the RAAC governance system
 * @dev Separates voting power logic from the main veRAACToken contract for better modularity
 * Key features:
 * - Time-weighted voting power calculation
 * - Historical checkpoints
 * - Slope-based power decay
 * - Boost calculations
 */
library VotingPowerLib {
    using RAACVoting for RAACVoting.Point;
    using TimeWeightedAverage for TimeWeightedAverage.Period;
    using Checkpoints for Checkpoints.Checkpoint[];

    /**
     * @notice Structure containing voting power calculation state
     * @dev Stores user points, checkpoints, and slope changes for power calculation
     */
    struct VotingPowerState {
        mapping(address => RAACVoting.Point) points;           // User voting points
        mapping(address => Checkpoints.Checkpoint[]) checkpoints; // Historical checkpoints
        mapping(uint256 => int128) slopeChanges;              // Slope changes at timestamps
    }

    /**
     * @notice Emitted when voting power is updated
     * @param user Address of the user whose power changed
     * @param oldPower Previous voting power value
     * @param newPower New voting power value
     */
    event VotingPowerUpdated(address indexed user, uint256 oldPower, uint256 newPower);

    /**
     * @notice Emitted when a checkpoint is written
     * @param account Address of the account
     * @param blockNumber Block number of the checkpoint
     * @param power Voting power at checkpoint
     */
    event CheckpointWritten(address indexed account, uint256 blockNumber, uint256 power);

    /**
     * @notice Thrown when attempting to query non-existent checkpoint
     */
    error NoCheckpointsFound();

    /**
     * @notice Thrown when power calculation parameters are invalid
     */
    error InvalidPowerParameters();

    /**
     * @notice Thrown when boost calculation parameters are invalid
     */
    error InvalidBoostParameters();

    /**
     * @notice Calculates and updates voting power for a user
     * @dev Updates points and slope changes for power decay
     * @param state The voting power state
     * @param user The user address
     * @param amount The amount of tokens
     * @param unlockTime The unlock timestamp
     * @return bias The calculated voting power bias
     * @return slope The calculated voting power slope
     */
    function calculateAndUpdatePower(
        VotingPowerState storage state,
        address user,
        uint256 amount,
        uint256 unlockTime
    ) internal returns (int128 bias, int128 slope) {
        if (amount == 0 || unlockTime <= block.timestamp) revert InvalidPowerParameters();
        
        uint256 MAX_LOCK_DURATION = 1460 days; // 4 years
        // FIXME: Get me to uncomment me when able
        // bias = RAACVoting.calculateBias(amount, unlockTime, block.timestamp);
        // slope = RAACVoting.calculateSlope(amount);

        // Calculate initial voting power that will decay linearly to 0 at unlock time
        uint256 duration = unlockTime - block.timestamp;
        uint256 initialPower = (amount * duration) / MAX_LOCK_DURATION; // Normalize by max duration
        
        bias = int128(int256(initialPower));
        slope = int128(int256(initialPower / duration)); // Power per second decay
        
        uint256 oldPower = getCurrentPower(state, user, block.timestamp);
        
        state.points[user] = RAACVoting.Point({
            bias: bias,
            slope: slope,
            timestamp: block.timestamp
        });

        _updateSlopeChanges(state, unlockTime, 0, slope);
        
        emit VotingPowerUpdated(user, oldPower, uint256(uint128(bias)));
        return (bias, slope);
    }

    /**
     * @notice Updates slope changes for voting power decay
     * @param state The voting power state
     * @param unlockTime The unlock timestamp
     * @param oldSlope The previous slope value
     * @param newSlope The new slope value
     */
    function _updateSlopeChanges(
        VotingPowerState storage state,
        uint256 unlockTime,
        int128 oldSlope,
        int128 newSlope
    ) internal {
        if (oldSlope != 0) {
            state.slopeChanges[unlockTime] -= oldSlope;
        }
        if (newSlope != 0) {
            state.slopeChanges[unlockTime] += newSlope;
        }
    }

    /**
     * @notice Writes a checkpoint for voting power
     * @param state The voting power state
     * @param account The account address
     * @param newPower The new voting power
     */
    function writeCheckpoint(
        VotingPowerState storage state,
        address account,
        uint256 newPower
    ) internal {
        uint32 blockNumber = uint32(block.number);
        uint224 compressed = Checkpoints.compress(newPower);
        
        state.checkpoints[account].push(Checkpoints.Checkpoint({
            fromBlock: blockNumber,
            value: compressed
        }));
    }

    /**
     * @notice Gets the last checkpoint for an account
     * @param state The voting power state
     * @param account The account address
     * @return The last checkpoint
     */
    function getLastAccountCheckpoint(
        VotingPowerState storage state,
        address account
    ) internal view returns (Checkpoints.Checkpoint memory) {
        Checkpoints.Checkpoint[] storage checkpoints = state.checkpoints[account];
        uint256 length = checkpoints.length;
        require(length > 0, "No checkpoints for account");
        return checkpoints[length - 1];
    }

    /**
     * @notice Calculates boost for a user
     * @param userBalance The user's veToken balance
     * @param totalSupply The total supply of veTokens
     * @param amount The amount to boost
     * @param maxBoost The maximum boost multiplier
     * @return The calculated boost value
     */
    function calculateBoost(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount,
        uint256 maxBoost
    ) internal pure returns (uint256) {
        if (totalSupply == 0) return amount;
        
        uint256 boost = (amount * maxBoost * userBalance) / (totalSupply * 10000);
        return boost > amount ? boost : amount;
    }

    /**
     * @notice Gets the current voting power for an account
     * @param state The voting power state
     * @param account The account to check
     * @param timestamp The timestamp to check power at
     * @return The current voting power
     */
    function getCurrentPower(
        VotingPowerState storage state,
        address account,
        uint256 timestamp
    ) internal view returns (uint256) {
        RAACVoting.Point memory point = state.points[account];
        if (point.timestamp == 0) return 0;
        
        if (timestamp < point.timestamp) {
            return uint256(uint128(point.bias));
        }
        
        uint256 timeDelta = timestamp - point.timestamp;
        
        // Calculate decay
        int128 adjustedBias = point.bias;
        if (timeDelta > 0) {
            // Calculate decay per second and multiply by time delta
            int128 decay = (point.slope * int128(int256(timeDelta))) / int128(int256(1));
            adjustedBias = point.bias - decay;
        }
        
        // Return 0 if power has fully decayed
        return adjustedBias > 0 ? uint256(uint128(adjustedBias)) : 0;
    }

    /**
     * @notice Calculates initial power for a user
     * @param amount The amount of tokens
     * @param duration The duration of the lock
     * @param currentTime The current timestamp
     * @return The calculated initial power
     */
    function calculateInitialPower(
        uint256 amount,
        uint256 duration,
        uint256 currentTime
    ) internal pure returns (uint256) {
        if (amount == 0 || duration == 0) return 0;
        
        // Calculate unlock time from duration
        uint256 unlockTime = currentTime + duration;
        // Calculate initial bias using RAACVoting library
        int128 bias = RAACVoting.calculateBias(
            amount,
            unlockTime,
            currentTime
        );

        // Convert bias to uint256, ensuring non-negative
        return bias > 0 ? uint256(uint128(bias)) : 0;
    }

    /**
     * @notice Calculates voting power at a specific timestamp
     * @dev Applies time-based decay to voting power
     * @param state The voting power state
     * @param account The account to check
     * @param timestamp The timestamp to check power at
     * @return The voting power at the specified timestamp
     */
    function calculatePowerAtTimestamp(
        VotingPowerState storage state,
        address account,
        uint256 timestamp
    ) internal view returns (uint256) {
        RAACVoting.Point memory point = state.points[account];
        if (point.timestamp == 0) return 0;
        
        if (timestamp < point.timestamp) {
            return 0;
        }
        
        uint256 timeDelta = timestamp - point.timestamp;
        
        int128 adjustedBias = point.bias - (point.slope * int128(int256(timeDelta)));
        
        return adjustedBias > 0 ? uint256(uint128(adjustedBias)) : 0;
    }
}
