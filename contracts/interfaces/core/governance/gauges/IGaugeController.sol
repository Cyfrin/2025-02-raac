// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IGaugeController
 * @author RAAC Protocol Team
 * @notice Interface for the gauge controller contract that manages gauge weights and rewards
 * @dev Implements voting mechanics and reward distribution for RWA/RAAC gauges
 * Key features:
 * - Gauge weight voting system
 * - Multiple gauge type support
 * - Time-weighted average tracking
 * - Reward distribution management
 * - Emergency controls and access management
 */
interface IGaugeController {
    /**
     * @notice Struct containing gauge information and state
     * @param weight Current gauge weight
     * @param typeWeight Weight multiplier for gauge type
     * @param lastUpdateTime Last time gauge was updated
     * @param gaugeType Type of gauge (RWA/RAAC)
     * @param isActive Whether gauge is currently active
     * @param lastRewardTime Last time rewards were distributed
     */
    struct Gauge {
        uint256 weight;
        uint256 typeWeight;
        uint256 lastUpdateTime;
        GaugeType gaugeType;
        bool isActive;
        uint256 lastRewardTime;
    }
    
    /**
     * @notice Enum for different types of gauges
     * @dev RWA for real world assets, RAAC for protocol tokens
     */
    enum GaugeType { RWA, RAAC }
    
    /**
     * @notice Struct for tracking emission periods
     * @param startTime Period start timestamp
     * @param endTime Period end timestamp
     * @param emission Total emissions for period
     * @param distributed Amount already distributed
     */
    struct Period {
        uint256 startTime;
        uint256 endTime;
        uint256 emission;
        uint256 distributed;
    }

    /**
     * @notice Gets the maximum boost multiplier allowed
     * @return Maximum boost value in basis points (e.g., 25000 for 2.5x)
     */
    function getMaxBoost() external view returns (uint256);

    /**
     * @notice Allows users to vote on gauge weights
     * @param gauge Address of gauge to vote for
     * @param weight Weight in basis points (0-10000)
     */
    function vote(address gauge, uint256 weight) external;

    /**
     * @notice Gets the current weight of a specific gauge
     * @param gauge Address of gauge to query
     * @return Current gauge weight
     */
    function getGaugeWeight(address gauge) external view returns (uint256);

    /**
     * @notice Gets the total weight of all active gauges
     * @return Sum of all active gauge weights
     */
    function getTotalWeight() external view returns (uint256);

    /**
     * @notice Gets the weight multiplier for a gauge type
     * @param gType Type of gauge to query
     * @return Weight multiplier for the gauge type
     */
    function getTypeWeight(GaugeType gType) external view returns (uint256);

    /**
     * @notice Checks if an address is a registered gauge
     * @param gauge Address to check
     * @return True if address is a registered gauge
     */
    function isGauge(address gauge) external view returns (bool);

    /**
     * @notice Gets the type of a specific gauge
     * @param gauge Address of gauge to query
     * @return Gauge type as uint256
     */
    function getGaugeType(address gauge) external view returns (uint256);

    /**
     * @notice Updates the time-weighted average period for a gauge
     * @param gauge Address of gauge to update
     */
    function updatePeriod(address gauge) external;

    /**
     * @notice Distributes rewards to a specific gauge
     * @param gauge Address of gauge to distribute rewards to
     */
    function distributeRewards(address gauge) external;

    /**
     * @notice Gets the veRAACToken contract address
     * @return IERC20 interface of the veRAACToken
     */
    function veRAACToken() external view returns (IERC20);

    /**
     * @notice Checks if an account has a specific role
     * @param role Role identifier
     * @param account Address to check
     * @return True if account has the role
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when gauge type weights are updated
     * @param gaugeType Type of gauge being updated
     * @param oldWeight Previous weight value
     * @param newWeight New weight value
     */
    event TypeWeightUpdated(GaugeType indexed gaugeType, uint256 oldWeight, uint256 newWeight);

    /**
     * @notice Emitted when a gauge's active status changes
     * @param gauge Address of the gauge
     * @param isActive New active status
     */
    event GaugeStatusUpdated(address indexed gauge, bool isActive);

    /**
     * @notice Emitted when emergency pause state changes
     * @param paused New pause state
     */
    event EmergencyPauseUpdated(bool paused);

    /**
     * @notice Emitted when a new gauge is created
     * @param gauge Address of the new gauge
     * @param gaugeType Type of the new gauge
     */
    event GaugeCreated(address indexed gauge, GaugeType indexed gaugeType);

    /**
     * @notice Emitted when a gauge's weight is updated
     * @param gauge Address of the gauge
     * @param oldWeight Previous weight value
     * @param newWeight New weight value
     */
    event WeightUpdated(address indexed gauge, uint256 oldWeight, uint256 newWeight);

    /**
     * @notice Emitted when rewards are distributed
     * @param gauge Address of the gauge
     * @param user Address of the user receiving rewards
     * @param amount Amount of rewards distributed
     */
    event RewardDistributed(address indexed gauge, address indexed user, uint256 amount);

    /**
     * @notice Emitted when a new period is started
     * @param gauge Address of the gauge
     * @param timestamp Start time of new period
     * @param newEmission New emission rate
     */
    event PeriodRolled(address indexed gauge, uint256 timestamp, uint256 newEmission);

    /**
     * @notice Emitted when emergency shutdown is triggered
     * @param gauge Address of the affected gauge
     * @param triggeredBy Address that triggered the shutdown
     */
    event EmergencyShutdown(address indexed gauge, address indexed triggeredBy);

    /**
     * @notice Emitted when a gauge is activated
     * @param gauge Address of the activated gauge
     */
    event GaugeActivated(address indexed gauge);

    /**
     * @notice Emitted when a gauge is deactivated
     * @param gauge Address of the deactivated gauge
     */
    event GaugeDeactivated(address indexed gauge);


    /**
     * @notice Emitted when a new gauge is added
     * @param gauge Address of the new gauge
     * @param gaugeType Type of the new gauge
     */
    event GaugeAdded(address gauge, GaugeType gaugeType);

    /**
     * @notice Emitted when a period is updated for a gauge
     * @param gauge Address of the gauge
     */
    event PeriodUpdated(address gauge);

    /**
     * @notice Emitted when rewards are distributed to a gauge
     * @param gauge Address of the gauge
     * @param amount Amount of rewards distributed
     */
    event RewardsDistributed(address gauge, uint256 amount);

    /**
     * @notice Emitted when revenue is distributed to gauges
     * @param gaugeType Type of the gauge
     * @param amount Total amount distributed
     * @param veRAACShare Amount distributed to veRAACToken holders
     * @param performanceShare Amount distributed to gauges
     */
    event RevenueDistributed(
        GaugeType indexed gaugeType,
        uint256 amount,
        uint256 veRAACShare,
        uint256 performanceShare
    );
    
   
    /* ========== ERRORS ========== */

    /// @notice Thrown when contract is in emergency pause state
    error EmergencyPaused();

    /// @notice Thrown when caller doesn't have required role
    error UnauthorizedCaller();

    /// @notice Thrown when attempting to access non-existent gauge
    error GaugeNotFound();

    /// @notice Thrown when attempting to add already existing gauge
    error GaugeAlreadyExists();

    /// @notice Thrown when weight is outside valid range
    error InvalidWeight();

    /// @notice Thrown when invalid gauge type is specified
    error InvalidGaugeType();

    /// @notice Thrown when user has no voting power
    error NoVotingPower();

    /// @notice Thrown when attempting to interact with inactive gauge
    error GaugeNotActive();

    /// @notice Thrown when period parameters are invalid
    error InvalidPeriod();

    /// @notice Thrown when reward amount exceeds limits
    error RewardTooHigh();

    /// @notice Thrown when contract has insufficient reward balance
    error InsufficientRewardBalance();

    /// @notice Thrown when attempting to update period too early
    error PeriodNotElapsed();

    /// @notice Thrown when period update parameters are invalid
    error InvalidPeriodUpdate();

    /// @notice Thrown when reward exceeds distribution cap
    error RewardCapExceeded();

    /// @notice Thrown when time range parameters are invalid
    error InvalidTimeRange();

    /// @notice Thrown when requested boost exceeds maximum
    error ExcessiveBoostRequested();

    /// @notice Thrown when provided address is invalid
    error InvalidAddress();

    /// @notice Thrown when voting delay is not met
    error VotingDelayNotMet();

    /// @notice Thrown when provided voting power is invalid
    error InvalidVotingPower();

    /// @notice Thrown when provided amount is invalid
    error InvalidAmount();

    /// @notice Thrown when distribution is in progress
    error DistributionInProgress();
}