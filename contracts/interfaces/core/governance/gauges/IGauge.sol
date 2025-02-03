// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../../libraries/math/TimeWeightedAverage.sol";

/**
 * @title IGauge
 * @notice Interface for gauge contracts that handle reward distribution and boost calculations
 * @dev Implements reward distribution with boost multipliers and time-weighted average tracking
 */
interface IGauge {
      /**
     * @notice Stores user-specific reward tracking state
     * @param lastUpdateTime Last time user's rewards were updated
     * @param rewardPerTokenPaid Stored reward per token value for user
     * @param rewards Accumulated rewards for user
     */
    struct UserState {
        uint256 lastUpdateTime;
        uint256 rewardPerTokenPaid; 
        uint256 rewards;
    }

    struct VoteState {
        uint256 direction;     // Vote direction
        uint256 weight;        // Vote weight
        uint256 timestamp;     // Vote timestamp
    }


    struct PeriodState {
        TimeWeightedAverage.Period votingPeriod;
        uint256 emission;                  // Total period emission cap (weekly/monthly)
        uint256 distributed;               // Amount distributed this period
        uint256 periodStartTime;           // Start timestamp of current period
    }

    /**
     * @notice Notifies contract of reward amount to distribute
     * @param amount Amount of rewards to distribute over the period
     */
    function notifyRewardAmount(uint256 amount) external;

    /**
     * @notice Gets total weight of the gauge
     * @return Total gauge weight
     */
    function getTotalWeight() external view returns (uint256);

    /**
     * @notice Updates period state for reward calculations
     */
    function updatePeriod() external;

    /**
     * @notice Claims accumulated rewards for caller
     * @dev Transfers earned rewards to caller
     */
    function getReward() external;

    /**
     * @notice Calculates earned rewards for account
     * @param account Address to calculate earnings for
     * @return Amount of rewards earned
     */
    function earned(address account) external view returns (uint256);

    /**
     * @notice Gets user's current weight including boost
     * @param user Address to get weight for
     * @return User's current weight
     */
    function getUserWeight(address user) external view returns (uint256);

    /**
     * @notice Gets latest applicable reward time
     * @return Latest of current time or period end
     */
    function lastTimeRewardApplicable() external view returns (uint256);

    /**
     * @notice Calculates current reward per token
     * @return Current reward per token value
     */
    function getRewardPerToken() external view returns (uint256);

    /**
     * @notice Gets duration of reward period
     * @return Period duration in seconds
     */
    function getPeriodDuration() external view returns (uint256);

    /**
     * @notice Creates checkpoint for reward calculations
     */
    function checkpoint() external;

    /**
     * @notice Gets time-weighted average weight
     * @return Time-weighted average weight value
     */
    function getTimeWeightedWeight() external view returns (uint256);

    /**
     * @notice Sets emergency pause state
     * @param _paused True to pause, false to unpause
     */
    function setEmergencyPaused(bool _paused) external;


    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when rewards are paid to a user
     * @param user Address of reward recipient
     * @param reward Amount of rewards paid
     */
    event RewardPaid(address indexed user, uint256 reward);

    /**
     * @notice Emitted when a checkpoint is created
     * @param user Address being checkpointed
     * @param timestamp Time of checkpoint
     */
    event Checkpoint(address indexed user, uint256 timestamp);

    /**
     * @notice Emitted when user rewards are updated
     * @param user Address whose rewards updated
     * @param reward New reward amount
     */
    event RewardUpdated(address indexed user, uint256 reward);

    /**
     * @notice Emitted when distribution cap is updated
     * @param newCap New distribution cap value
     */
    event DistributionCapUpdated(uint256 newCap);

    /**
     * @notice Emitted when a user stakes tokens
     * @param user Address of the staker
     * @param amount Amount of tokens staked
     */
    event Staked(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a user withdraws tokens
     * @param user Address of the withdrawer
     * @param amount Amount of tokens withdrawn
     */
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a user votes on yield direction
     * @param user Address of the voter
     * @param direction Voting direction in basis points
     * @param votingPower Voting power used
     */
    event DirectionVoted(address indexed user, uint256 direction, uint256 votingPower);
    
    /**
     * @notice Emitted when a period is updated
     * @param timestamp Timestamp of the period update
     * @param avgWeight Average weight of the period
     */
    event PeriodUpdated(uint256 timestamp, uint256 avgWeight);

    /**
     * @notice Emitted when emission is updated
     * @param emission New emission amount
     */
    event EmissionUpdated(uint256 emission);
    
    /**
     * @notice Emitted when a reward amount is notified
     * @param amount Amount of rewards notified
     */
    event RewardNotified(uint256 amount);
    /* ========== ERRORS ========== */
    error InvalidWeight();           // Weight parameter is invalid
    error NoVotingPower();          // Caller has no voting power
    error RewardCapExceeded();      // Reward amount exceeds cap
    error PeriodNotElapsed();       // Current period not finished
    error ZeroRewardRate();         // Invalid zero reward rate
    error InvalidAmount();          // Invalid input amount
    error InsufficientBalance();    // Insufficient token balance
    error UnauthorizedCaller();     // Caller not authorized
    error ClaimTooFrequent();       // Claims too frequent
    error ExcessiveRewardRate();    // Excessive reward rate
    error InsufficientRewardBalance(); // Insufficient reward balance
}
