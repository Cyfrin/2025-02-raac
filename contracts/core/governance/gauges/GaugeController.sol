// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../../interfaces/core/governance/gauges/IGauge.sol";
import "../../../interfaces/core/governance/gauges/IGaugeController.sol";

import "../../../libraries/math/TimeWeightedAverage.sol";
import "../../../libraries/governance/BoostCalculator.sol";

/**
 * @title GaugeController
 * @author RAAC Protocol Team
 * @notice Controls gauge weights and reward distribution for RWA and RAAC emissions
 * @dev Core contract for managing gauge voting, weights and reward distribution
 * Key features:
 * - Gauge weight voting by veRAACToken holders
 * - Time-weighted average tracking of weights
 * - Multiple gauge type support (RWA/RAAC)
 * - Boost calculation for rewards
 * - Revenue sharing system
 * - Emergency controls
 *
 * The GaugeController implements a Curve-style gauge voting and reward distribution system:
 * - Users vote with veRAACToken to allocate weights to gauges
 * - Weights determine emission rates for each gauge
 * - Boost multipliers are calculated based on veToken holdings
 * - Revenue sharing distributes protocol fees between veToken holders and gauges
 * - Emergency controls allow pausing and shutting down gauges
 */
contract GaugeController is IGaugeController, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using TimeWeightedAverage for TimeWeightedAverage.Period;
    using BoostCalculator for BoostCalculator.BoostState;

    /**
     * @notice Access control roles for contract management
     * @dev GAUGE_ADMIN can manage gauges and weights
     * @dev EMERGENCY_ADMIN can pause and trigger emergency actions
     * @dev FEE_ADMIN controls fee parameters
     */
    bytes32 public constant GAUGE_ADMIN = keccak256("GAUGE_ADMIN");
    bytes32 public constant EMERGENCY_ADMIN = keccak256("EMERGENCY_ADMIN"); 
    bytes32 public constant FEE_ADMIN = keccak256("FEE_ADMIN");

    /**
     * @notice Core state variables for gauge management
     * @dev Immutable veRAACToken address and gauge tracking
     */
    /// @notice Address of the veRAACToken contract
    IERC20 public immutable veRAACToken;
    /// @notice Mapping of gauge addresses to their state data
    mapping(address => Gauge) public gauges;
    /// @notice Array containing all gauge addresses
    address[] private _gaugeList;

    /**
     * @notice Constants for boost and weight calculations
     * @dev All values in basis points (10000 = 100%)
     */
    /// @notice Maximum boost multiplier (2.5x)
    uint256 public constant MAX_BOOST = 25000;        // 2.5x maximum boost
    /// @notice Minimum boost multiplier (1.0x)
    uint256 public constant MIN_BOOST = 10000;        // 1.0x minimum boost
    /// @notice Weight precision
    uint256 public constant WEIGHT_PRECISION = 10000;  // Weight precision
    /// @notice Maximum type weight
    uint256 public constant MAX_TYPE_WEIGHT = 10000;   // Maximum type weight

    /**
     * @notice Voting system configuration and state
     * @dev Includes vote tracking and time constraints
     */
    /// @notice Maps user addresses to their gauge votes
    mapping(address => mapping(address => uint256)) public userGaugeVotes;
    /// @notice Last vote timestamp for each user
    mapping(address => uint256) public lastVoteTime;
    /// @notice Required delay between votes
    uint256 public constant VOTE_DELAY = 10 days;
    /// @notice Minimum allowed vote delay
    uint256 public constant MIN_VOTE_DELAY = 1 days;
    /// @notice Maximum allowed vote delay
    uint256 public constant MAX_VOTE_DELAY = 10 days;
    /// @notice Minimum vote weight allowed
    uint256 public constant MIN_VOTE_WEIGHT = 100;    // 1% minimum vote
    /**
     * @notice Type weights and periods
     * @dev Tracking for gauge type weights and their time periods
     * typeWeights: Weight multipliers for each gauge type
     * typePeriods: Period data for each gauge type
     */
    mapping(GaugeType => uint256) public typeWeights;
    mapping(GaugeType => Period) public typePeriods;

    /**
     * @notice Revenue sharing configuration
     * @dev Mappings for protocol fees and performance fees
     * revenueShares: Protocol fee shares by gauge type (80% protocol fees)
     * performanceFees: Performance fee rates by gauge (20% yield products)
     */
    mapping(GaugeType => uint256) public revenueShares; // 80% protocol fees
    mapping(address => uint256) public performanceFees; // 20% yield products

    /**
     * @notice Period tracking state
     * @dev Time-weighted average periods and voting slopes
     * gaugePeriods: Period data for each gauge
     * globalVotingSlopes: Global voting power change slopes
     */
    mapping(address => TimeWeightedAverage.Period) public gaugePeriods;
    mapping(uint256 => int128) public globalVotingSlopes;

    /**
     * @notice Boost calculation state
     * @dev Internal state for boost calculations
     * Contains boost parameters and calculation data
     */
    BoostCalculator.BoostState private boostState;

    /**
     * @notice Initializes the GaugeController with veRAACToken
     * @dev Sets up roles, parameters, and initial type weights
     * @param _veRAACToken Address of the veRAACToken contract
     */
    constructor(address _veRAACToken) {
        if (_veRAACToken == address(0)) revert InvalidAddress();
        
        veRAACToken = IERC20(_veRAACToken);
        
        // Setup roles
        _initializeRoles();
        
        // Initialize boost parameters
        _initializeBoostParameters();
            
        // Set default type weights
        _initializeTypeWeights();
    }

    /**
     * @notice Internal function to initialize access control roles
     * @dev Grants all initial roles to contract deployer
     */
    function _initializeRoles() private {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAUGE_ADMIN, msg.sender);
        _grantRole(EMERGENCY_ADMIN, msg.sender);
        _grantRole(FEE_ADMIN, msg.sender);
    }

    /**
     * @notice Initializes boost calculation parameters
     * @dev Sets max/min boost and boost window duration
     */
    function _initializeBoostParameters() private {
        boostState.maxBoost = MAX_BOOST;
        boostState.minBoost = MIN_BOOST;
        boostState.boostWindow = 7 days;
    }

    /**
     * @notice Sets initial weights for gauge types
     * @dev Evenly splits weight between RWA and RAAC types
     */
    function _initializeTypeWeights() private {
        typeWeights[GaugeType.RWA] = 5000; // 50%
        typeWeights[GaugeType.RAAC] = 5000; // 50%
    }

    /**
     * @notice Modifier to restrict access to gauge admin
     * @dev Reverts if caller does not have GAUGE_ADMIN role
     */
    modifier onlyGaugeAdmin() {
        if (!hasRole(GAUGE_ADMIN, msg.sender)) revert UnauthorizedCaller();
        _;
    }

    /**
     * @notice Core voting functionality for gauge weights
     * @dev Updates gauge weights based on user's veToken balance
     * @param gauge Address of gauge to vote for
     * @param weight New weight value in basis points (0-10000)
     */
    function vote(address gauge, uint256 weight) external override whenNotPaused {
        if (!isGauge(gauge)) revert GaugeNotFound();
        if (weight > WEIGHT_PRECISION) revert InvalidWeight();
        
        uint256 votingPower = veRAACToken.balanceOf(msg.sender);
        if (votingPower == 0) revert NoVotingPower();

        uint256 oldWeight = userGaugeVotes[msg.sender][gauge];
        userGaugeVotes[msg.sender][gauge] = weight;
        
        _updateGaugeWeight(gauge, oldWeight, weight, votingPower);
        
        emit WeightUpdated(gauge, oldWeight, weight);
    }

    /**
     * @notice Updates a gauge's weight based on vote changes
     * @dev Recalculates gauge weight using voting power
     * @param gauge Address of the gauge
     * @param oldWeight Previous vote weight
     * @param newWeight New vote weight
     * @param votingPower Voter's voting power
     */
    function _updateGaugeWeight(
        address gauge,
        uint256 oldWeight,
        uint256 newWeight,
        uint256 votingPower
    ) internal {
        Gauge storage g = gauges[gauge];
        
        uint256 oldGaugeWeight = g.weight;
        uint256 newGaugeWeight = oldGaugeWeight - (oldWeight * votingPower / WEIGHT_PRECISION)
            + (newWeight * votingPower / WEIGHT_PRECISION);
            
        g.weight = newGaugeWeight;
        g.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Adds a new gauge to the system
     * @dev Only callable by gauge admin
     * @param gauge Address of gauge to add
     * @param gaugeType Type of gauge (RWA/RAAC)
     * @param initialWeight Initial gauge weight
     */
    function addGauge(
        address gauge,
        GaugeType gaugeType,
        uint256 initialWeight
    ) external onlyGaugeAdmin {
        if (gauges[gauge].lastUpdateTime != 0) revert GaugeAlreadyExists();
        if (gaugeType != GaugeType.RWA && gaugeType != GaugeType.RAAC) {
            revert InvalidGaugeType();
        }

        // Use minimum weight (1) for period tracking if initialWeight is 0
        uint256 periodWeight = initialWeight == 0 ? 1 : initialWeight;
        uint256 duration = gaugeType == GaugeType.RWA ? 30 days : 7 days;

        gauges[gauge] = Gauge({
            weight: initialWeight,
            typeWeight: 0,
            lastUpdateTime: block.timestamp,
            gaugeType: gaugeType,
            isActive: true,
            lastRewardTime: block.timestamp
        });

        // Initialize period with current timestamp
        TimeWeightedAverage.Period storage period = gaugePeriods[gauge];
        TimeWeightedAverage.createPeriod(
            period,
            block.timestamp, // Start from current timestamp
            duration,
            periodWeight,
            periodWeight
        );

        _gaugeList.push(gauge);
        emit GaugeAdded(gauge, gaugeType);
    }

    /**
     * @notice Updates the time period for a gauge
     * @dev Rolls over to new period if current period has elapsed
     * @param gauge Address of the gauge to update
     */
    function updatePeriod(address gauge) external override whenNotPaused {
        Gauge storage g = gauges[gauge];
        if (!g.isActive) revert GaugeNotActive();
        
        TimeWeightedAverage.Period storage period = gaugePeriods[gauge];
        uint256 duration = g.gaugeType == GaugeType.RWA ? 30 days : 7 days;
        
        // If this is the first period, initialize it
        if (period.startTime == 0) {
            TimeWeightedAverage.createPeriod(
                period,
                // Add 1 second to avoid timestamp collision
                block.timestamp + 1,
                duration,
                0,
                g.weight
            );
            emit PeriodRolled(gauge, block.timestamp, g.weight);
            return;
        }
        
        // Check if current period has elapsed
        if (block.timestamp < period.startTime + period.totalDuration) {
            revert PeriodNotElapsed();
        }
        
        uint256 average = TimeWeightedAverage.calculateAverage(period, block.timestamp);
        
        TimeWeightedAverage.createPeriod(
            period,
            // Add 1 second to avoid timestamp collision
            block.timestamp + 1,
            duration,
            average,
            g.weight
        );
        
        emit PeriodRolled(gauge, block.timestamp, g.weight);
    }

    /**
     * @notice Distributes rewards to a gauge
     * @dev Calculates and transfers rewards based on gauge weight
     * @param gauge Address of gauge to distribute rewards to
     */
    function distributeRewards(
        address gauge
    ) external override nonReentrant whenNotPaused {
        if (!isGauge(gauge)) revert GaugeNotFound();
        if (!gauges[gauge].isActive) revert GaugeNotActive();
        
        uint256 reward = _calculateReward(gauge);
        if (reward == 0) return;
        
        IGauge(gauge).notifyRewardAmount(reward);
        emit RewardDistributed(gauge, msg.sender, reward);
    }

    /**
     * @notice Sets weight for a gauge type
     * @dev Only callable by gauge admin
     * @param gaugeType Type of gauge to set weight for
     * @param weight New weight value
     */
    function setTypeWeight(
        GaugeType gaugeType,
        uint256 weight
    ) external onlyRole(GAUGE_ADMIN) {
        if (weight > MAX_TYPE_WEIGHT) revert InvalidWeight();
        
        uint256 oldWeight = typeWeights[gaugeType];
        typeWeights[gaugeType] = weight;
        
        emit TypeWeightUpdated(gaugeType, oldWeight, weight);
    }

    /**
     * @notice Calculates reward amount for a gauge
     * @dev Uses gauge weight and type weight to determine share
     * @param gauge Address of gauge to calculate reward for
     * @return Calculated reward amount
     */
    function _calculateReward(address gauge) internal view returns (uint256) {
        Gauge storage g = gauges[gauge];
        uint256 totalWeight = getTotalWeight();
        if (totalWeight == 0) return 0;
        
        uint256 gaugeShare = (g.weight * WEIGHT_PRECISION) / totalWeight;
        uint256 typeShare = (typeWeights[g.gaugeType] * WEIGHT_PRECISION) / MAX_TYPE_WEIGHT;
        
        // Calculate period emissions based on gauge type
        uint256 periodEmission = g.gaugeType == GaugeType.RWA ? _calculateRWAEmission() : _calculateRAACEmission();
            
        return (periodEmission * gaugeShare * typeShare) / (WEIGHT_PRECISION * WEIGHT_PRECISION);
    }

    /**
     * @notice Calculates RWA emission rate
     * @dev Monthly emission rate for RWA gauges
     * @return Monthly emission amount
     */
    function _calculateRWAEmission() internal view returns (uint256) {
        // Monthly RWA emission calculation
        // This should be implemented based on your tokenomics
        return 1000000 * 10**18; // Example value
    }

    /**
     * @notice Calculates RAAC emission rate
     * @dev Weekly emission rate for RAAC gauges
     * @return Weekly emission amount
     */
    function _calculateRAACEmission() internal view returns (uint256) {
        // Weekly RAAC emission calculation
        // This should be implemented based on your tokenomics
        return 250000 * 10**18; // Example value
    }

    /**
     * @notice Checks if an address is a registered gauge
     * @param gauge Address to check
     * @return bool True if address is a gauge
     */
    function isGauge(address gauge) public view override returns (bool) {
        return gauges[gauge].lastUpdateTime != 0;
    }

    /**
     * @notice Gets the current weight of a gauge
     * @param gauge Address of gauge
     * @return Current gauge weight
     */
    function getGaugeWeight(address gauge) external view override returns (uint256) {
        return gauges[gauge].weight;
    }

    /**
     * @notice Gets total weight of all active gauges
     * @return Total weight across all gauges
     */
    function getTotalWeight() public view override returns (uint256) {
        uint256 total = 0;
        // This could be optimized by maintaining a running total
        for (uint256 i = 0; i < _gaugeList.length; i++) {
            if (gauges[_gaugeList[i]].isActive) {
                total += gauges[_gaugeList[i]].weight;
            }
        }
        return total;
    }

    /**
     * @notice Gets weight for a gauge type
     * @param gType Type of gauge
     * @return Weight for the gauge type
     */
    function getTypeWeight(GaugeType gType) external view override returns (uint256) {
        return typeWeights[gType];
    }

    /**
     * @notice Toggles active status of a gauge
     * @dev Only callable by gauge admin
     * @param gauge Address of gauge to toggle
     */
    function toggleGaugeStatus(address gauge) external onlyGaugeAdmin {
        if (!isGauge(gauge)) revert GaugeNotFound();
        gauges[gauge].isActive = !gauges[gauge].isActive;
        emit GaugeStatusUpdated(gauge, gauges[gauge].isActive);
    }

    /**
     * @notice Sets emergency pause state
     * @dev Only callable by emergency admin
     * @param paused New pause state
     */
    function setEmergencyPause(bool paused) external {
        if (!hasRole(EMERGENCY_ADMIN, msg.sender)) revert UnauthorizedCaller();
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
        emit EmergencyPauseUpdated(paused);
    }

    /**
     * @notice Gets list of all gauges
     * @return Array of gauge addresses
     */
    function getGauges() external view returns (address[] memory) {
        return _gaugeList;
    }

    /**
     * @notice Gets list of active gauges
     * @return Array of active gauge addresses
     */
    function getActiveGauges() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _gaugeList.length; i++) {
            if (gauges[_gaugeList[i]].isActive) activeCount++;
        }

        address[] memory activeGauges = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _gaugeList.length; i++) {
            if (gauges[_gaugeList[i]].isActive) {
                activeGauges[index++] = _gaugeList[i];
            }
        }
        return activeGauges;
    }

    /**
     * @notice Emergency shuts down a gauge
     * @dev Only callable by emergency admin
     * @param gauge Address of gauge to shut down
     */
    function emergencyShutdown(address gauge) external {
        if (!hasRole(EMERGENCY_ADMIN, msg.sender)) revert UnauthorizedCaller();
        if (!isGauge(gauge)) revert GaugeNotFound();
        
        gauges[gauge].isActive = false;
        emit EmergencyShutdown(gauge, msg.sender);
    }   

    /**
     * @notice Distributes revenue between veToken holders and gauges
     * @dev Only callable by emergency admin
     * @param gaugeType Type of gauge for distribution
     * @param amount Amount to distribute
     */
    function distributeRevenue(
        GaugeType gaugeType,
        uint256 amount
    ) external onlyRole(EMERGENCY_ADMIN) whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        uint256 veRAACShare = amount * 80 / 100; // 80% to veRAAC holders
        uint256 performanceShare = amount * 20 / 100; // 20% performance fee
        
        revenueShares[gaugeType] += veRAACShare;
        _distributeToGauges(gaugeType, veRAACShare);
        
        emit RevenueDistributed(gaugeType, amount, veRAACShare, performanceShare);
    }

  

    /**
     * @notice Distributes rewards to gauges of a specific type
     * @dev Internal function to handle gauge reward distribution
     * @param gaugeType Type of gauges to distribute to
     * @param amount Total amount to distribute
     */
    function _distributeToGauges(
        GaugeType gaugeType,
        uint256 amount
    ) internal {
        uint256 totalTypeWeight = 0;
        uint256[] memory gaugeWeights = new uint256[](_gaugeList.length);
        uint256 activeGaugeCount = 0;

        // First pass: calculate total weight and store gauge weights
        for (uint256 i = 0; i < _gaugeList.length; i++) {
            address gauge = _gaugeList[i];
            if (gauges[gauge].isActive && gauges[gauge].gaugeType == gaugeType) {
                gaugeWeights[i] = gauges[gauge].weight;
                totalTypeWeight += gaugeWeights[i];
                activeGaugeCount++;
            }
        }

        if (totalTypeWeight == 0 || activeGaugeCount == 0) return;

        // Second pass: distribute rewards
        for (uint256 i = 0; i < _gaugeList.length; i++) {
            address gauge = _gaugeList[i];
            if (gauges[gauge].isActive && gauges[gauge].gaugeType == gaugeType) {
                uint256 gaugeShare = (amount * gaugeWeights[i]) / totalTypeWeight;
                if (gaugeShare > 0) {
                    IGauge(gauge).notifyRewardAmount(gaugeShare);
                }
            }
        }
    }

    /**
     * @notice Checks if an account has a role
     * @param role Role to check
     * @param account Account to check
     * @return bool True if account has role
     */
    function hasRole(bytes32 role, address account) public view virtual override(AccessControl, IGaugeController) returns (bool) {
        return super.hasRole(role, account);
    }

    /**
     * @notice Gets maximum boost multiplier
     * @return Maximum boost in basis points
     */
    function getMaxBoost() external pure override returns (uint256) {
        return MAX_BOOST;
    }

    /**
     * @notice Gets type of a gauge
     * @param gauge Address of gauge
     * @return Gauge type as uint
     */
    function getGaugeType(address gauge) external view override returns (uint256) {
        if (!isGauge(gauge)) revert GaugeNotFound();
        return uint256(gauges[gauge].gaugeType);
    }

    /**
     * @notice Calculates boost for a user's position
     * @param user Address of user
     * @param gauge Address of gauge
     * @param amount Amount to calculate boost for
     * @return boostBasisPoints Boost multiplier in basis points
     * @return boostedAmount Boosted amount after applying multiplier
     */
    function calculateBoost(
        address user,
        address gauge,
        uint256 amount
    ) external view returns (uint256 boostBasisPoints, uint256 boostedAmount) {
        if (!isGauge(gauge)) revert GaugeNotFound();
        
        uint256 userBalance = veRAACToken.balanceOf(user);
        uint256 totalSupply = veRAACToken.totalSupply();

        return boostState.calculateTimeWeightedBoost(
            userBalance,
            totalSupply,
            amount
        );
    }

}