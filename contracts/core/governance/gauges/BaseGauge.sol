// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../../interfaces/core/governance/gauges/IGauge.sol";
import "../../../interfaces/core/governance/gauges/IGaugeController.sol";

import "../../../libraries/governance/BoostCalculator.sol";
import "../../../libraries/math/TimeWeightedAverage.sol";

/**
 * @title BaseGauge
 * @author RAAC Protocol Team
 * @notice Base implementation for RWA and RAAC gauges that handles reward distribution and boost calculations
 * @dev Abstract contract implementing core gauge functionality including:
 * - Reward distribution with boost multipliers (based on user weight)
 * - Time-weighted average tracking
 * - Access control and security features, emergency controls
 * - Staking functionality for reward tokens
 */
abstract contract BaseGauge is IGauge, ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;
    using TimeWeightedAverage for TimeWeightedAverage.Period;

    /// @notice Token distributed as rewards
    IERC20 public immutable rewardToken;
    
    /// @notice Token that can be staked
    IERC20 public immutable stakingToken;

    /// @notice Controller contract managing gauge weights
    address public immutable controller;
    
    /// @notice Period for tracking time-weighted averages
    TimeWeightedAverage.Period public weightPeriod;
    
    /// @notice Mapping of user addresses to their reward state
    mapping(address => UserState) public userStates;
    
    /// @notice Current rate of reward distribution
    uint256 public rewardRate;
    
    /// @notice Last time rewards were updated
    uint256 public lastUpdateTime;
    
    /// @notice Accumulated rewards per token
    uint256 public rewardPerTokenStored;
    
    /// @notice Maximum allowed slippage (1%)
    uint256 public constant MAX_SLIPPAGE = 100;
    
    /// @notice Precision for weight calculations
    uint256 public constant WEIGHT_PRECISION = 10000;
    
    /// @notice Maximum reward rate to prevent overflow
    uint256 public constant MAX_REWARD_RATE = 1000000e18;
    
    /// @notice Mapping of last claim times per user
    mapping(address => uint256) public lastClaimTime;
    
    /// @notice Minimum interval between reward claims
    uint256 public constant MIN_CLAIM_INTERVAL = 1 days;

    /// @notice State for boost calculations
    BoostCalculator.BoostState public boostState;
    
    /// @notice Cap on reward distribution amount
    uint256 public distributionCap;

    /// @notice Role for controller functions
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    
    /// @notice Role for emergency admin functions
    bytes32 public constant EMERGENCY_ADMIN = keccak256("EMERGENCY_ADMIN");
    
    /// @notice Role for fee admin functions
    bytes32 public constant FEE_ADMIN = keccak256("FEE_ADMIN");

    /// @notice Staking state variables
    uint256 private _totalSupply;    // Total staked amount
    mapping(address => uint256) private _balances;    // User balances

    /// @notice Total votes across all users
    uint256 public totalVotes;
    
    /// @notice Current period state
    PeriodState public periodState;
    
    /// @notice User voting data
    mapping(address => VoteState) public userVotes;

    // Modifiers

    /**
     * @notice Restricts function to controller role
     */
    modifier onlyController() {
        if (!hasRole(CONTROLLER_ROLE, msg.sender)) revert UnauthorizedCaller();
        _;
    }

    /**
     * @notice Updates rewards before executing function
     * @param account Address to update rewards for
     */
    modifier updateReward(address account) {
        _updateReward(account);
        _;
    }


    /**
     * @notice Initializes the gauge contract
     * @param _rewardToken Address of reward token
     * @param _stakingToken Address of staking token
     * @param _controller Address of controller contract
     * @param _maxEmission Maximum emission amount
     * @param _periodDuration Duration of the period
     */
    constructor(
        address _rewardToken,
        address _stakingToken,
        address _controller,
        uint256 _maxEmission,
        uint256 _periodDuration
    ) {
        rewardToken = IERC20(_rewardToken);
        stakingToken = IERC20(_stakingToken);
        controller = _controller;
        
        // Initialize roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CONTROLLER_ROLE, _controller);
        
        // Initialize boost parameters
        boostState.maxBoost = 25000; // 2.5x
        boostState.minBoost = 1e18;
        boostState.boostWindow = 7 days;

        uint256 currentTime = block.timestamp;
        uint256 nextPeriod = ((currentTime / _periodDuration) * _periodDuration) + _periodDuration;
        
        // Initialize period state
        periodState.periodStartTime = nextPeriod;
        periodState.emission = _maxEmission;
        TimeWeightedAverage.createPeriod(
            periodState.votingPeriod,
            nextPeriod,
            _periodDuration,
            0,
            10000 // VOTE_PRECISION
        );
    }

    // Internal functions

    /**
     * @notice Updates reward state for an account
     * @dev Calculates and updates reward state including per-token rewards
     * @param account Address to update rewards for
     */
    function _updateReward(address account) internal {
        rewardPerTokenStored = getRewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            UserState storage state = userStates[account];
            state.rewards = earned(account);
            state.rewardPerTokenPaid = rewardPerTokenStored;
            state.lastUpdateTime = block.timestamp;
            emit RewardUpdated(account, state.rewards);
        }
    }

    /**
     * @notice Updates weights for time-weighted average calculation
     * @dev Creates new period or updates existing one with new weight
     * @param newWeight New weight value to record
     */
    function _updateWeights(uint256 newWeight) internal {
        uint256 currentTime = block.timestamp;
        uint256 duration = getPeriodDuration();
        
        if (weightPeriod.startTime == 0) {
            // For initial period, start from next period boundary
            uint256 nextPeriodStart = ((currentTime / duration) + 1) * duration;
            TimeWeightedAverage.createPeriod(
                weightPeriod,
                nextPeriodStart,
                duration,
                newWeight,
                WEIGHT_PRECISION
            );
        } else {
            // For subsequent periods, ensure we're creating a future period
            uint256 nextPeriodStart = ((currentTime / duration) + 1) * duration;
            TimeWeightedAverage.createPeriod(
                weightPeriod,
                nextPeriodStart,
                duration,
                newWeight,
                WEIGHT_PRECISION
            );
        }
    }

    /**
     * @notice Gets base weight for an account
     * @dev Virtual function to be implemented by child contracts
     * @param account Address to get weight for
     * @return Base weight value
     */
    function _getBaseWeight(address account) internal view virtual returns (uint256) {
        return IGaugeController(controller).getGaugeWeight(address(this));
    }

    /**
     * @notice Applies boost multiplier to base weight
     * @dev Calculates boost based on veToken balance and parameters
     * @param account Address to calculate boost for
     * @param baseWeight Base weight to apply boost to
     * @return Boosted weight value
     */
    function _applyBoost(address account, uint256 baseWeight) internal view virtual returns (uint256) {
        if (baseWeight == 0) return 0;
        
        IERC20 veToken = IERC20(IGaugeController(controller).veRAACToken());
        uint256 veBalance = veToken.balanceOf(account);
        uint256 totalVeSupply = veToken.totalSupply();

        // Create BoostParameters struct from boostState
        BoostCalculator.BoostParameters memory params = BoostCalculator.BoostParameters({
            maxBoost: boostState.maxBoost,
            minBoost: boostState.minBoost,
            boostWindow: boostState.boostWindow,
            totalWeight: boostState.totalWeight,
            totalVotingPower: boostState.totalVotingPower,
            votingPower: boostState.votingPower
        });

        uint256 boost = BoostCalculator.calculateBoost(
            veBalance,
            totalVeSupply,
            params
        );
        
        return (baseWeight * boost) / 1e18;
    }

    // External functions

    /**
     * @notice Stakes tokens in the gauge
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert InvalidAmount();
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraws staked tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert InvalidAmount();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Gets balance of an account
     * @param account Address to check balance for
     * @return Account balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Gets total supply
     * @return Total supply value
     */
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }


    /**
     * @notice Sets emergency pause state
     * @param paused True to pause, false to unpause
     */
    function setEmergencyPaused(bool paused) external {
        if (!hasRole(EMERGENCY_ADMIN, msg.sender)) revert UnauthorizedCaller();
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @notice Sets cap on reward distribution
     * @param newCap New distribution cap value
     */
    function setDistributionCap(uint256 newCap) external {
        if (!hasRole(FEE_ADMIN, msg.sender)) revert UnauthorizedCaller();
        distributionCap = newCap;
        emit DistributionCapUpdated(newCap);
    }

    /**
     * @notice Claims accumulated rewards
     * @dev Transfers earned rewards to caller
     */
    function getReward() external virtual nonReentrant whenNotPaused updateReward(msg.sender) {
        if (block.timestamp - lastClaimTime[msg.sender] < MIN_CLAIM_INTERVAL) {
            revert ClaimTooFrequent();
        }
        
        lastClaimTime[msg.sender] = block.timestamp;
        UserState storage state = userStates[msg.sender];
        uint256 reward = state.rewards;
        
        if (reward > 0) {
            state.rewards = 0;
            
            uint256 balance = rewardToken.balanceOf(address(this));
            if (reward > balance) {
                revert InsufficientBalance();
            }
            
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @notice Notifies contract of reward amount
     * @dev Updates reward rate based on new amount
     * @param amount Amount of rewards to distribute
     */
    function notifyRewardAmount(uint256 amount) external override onlyController updateReward(address(0)) {
        if (amount > periodState.emission) revert RewardCapExceeded();
        
        rewardRate = notifyReward(periodState, amount, periodState.emission, getPeriodDuration());
        periodState.distributed += amount;
        
        uint256 balance = rewardToken.balanceOf(address(this));
        if (rewardRate * getPeriodDuration() > balance) {
            revert InsufficientRewardBalance();
        }
        
        lastUpdateTime = block.timestamp;
        emit RewardNotified(amount);
    }

    /**
     * @notice Notifies about new reward amount
     * @param state Period state to update
     * @param amount Reward amount
     * @param maxEmission Maximum emission allowed
     * @param periodDuration Duration of the period
     * @return newRewardRate Calculated reward rate
     */
    function notifyReward(
        PeriodState storage state,
        uint256 amount,
        uint256 maxEmission,
        uint256 periodDuration
    ) internal view returns (uint256) {
        if (amount > maxEmission) revert RewardCapExceeded();
        if (amount + state.distributed > state.emission) {
            revert RewardCapExceeded();
        }

        uint256 rewardRate = amount / periodDuration;
        if (rewardRate == 0) revert ZeroRewardRate();

        return rewardRate;
    }

    /**
     * @notice Emergency withdrawal of tokens
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

     /**
     * @notice Allows users to vote on direction
     * @param direction Direction in basis points (0-10000)
     */
    function voteDirection(uint256 direction) public whenNotPaused updateReward(msg.sender) {
        if (direction > 10000) revert InvalidWeight();
        
        uint256 votingPower = IERC20(IGaugeController(controller).veRAACToken()).balanceOf(msg.sender);
        if (votingPower == 0) revert NoVotingPower();
        
        totalVotes = processVote(
            userVotes[msg.sender],
            direction,
            votingPower,
            totalVotes
        );
        emit DirectionVoted(msg.sender, direction, votingPower);
    }

    /**
     * @notice Processes a vote for direction
     * @param vote Vote state to update
     * @param direction New vote direction
     * @param votingPower Voter's voting power
     * @param totalVotes Total votes to update
     * @return newTotalVotes Updated total votes
     */
    function processVote(
        VoteState storage vote,
        uint256 direction,
        uint256 votingPower,
        uint256 totalVotes
    ) internal returns (uint256) {
        if (direction > 10000) revert InvalidWeight();
        if (votingPower == 0) revert NoVotingPower();

        uint256 newTotalVotes = totalVotes - vote.weight + votingPower;

        vote.direction = direction;
        vote.weight = votingPower;
        vote.timestamp = block.timestamp;

        return newTotalVotes;
    }


    /**
     * @notice Updates the period and calculates new weights
     */
    function updatePeriod() external override onlyController {
        uint256 currentTime = block.timestamp;
        uint256 periodEnd = periodState.periodStartTime + getPeriodDuration();
        
        if (currentTime < periodEnd) {
            revert PeriodNotElapsed();
        }

        uint256 periodDuration = getPeriodDuration();
        // Calculate average weight for the ending period
        uint256 avgWeight = periodState.votingPeriod.calculateAverage(periodEnd);
        
        // Calculate the start of the next period (ensure it's in the future)
        uint256 nextPeriodStart = ((currentTime / periodDuration) + 2) * periodDuration;
        
        // Reset period state
        periodState.distributed = 0;
        periodState.periodStartTime = nextPeriodStart;

        // Create new voting period
        TimeWeightedAverage.createPeriod(
            periodState.votingPeriod,
            nextPeriodStart,
            periodDuration,
            avgWeight,
            WEIGHT_PRECISION
        );
    }

 
    /**
     * @notice Sets emission cap for the period
     * @param emission New emission amount
     */
    function setEmission(uint256 emission) external onlyController {
        if (emission > periodState.emission) revert RewardCapExceeded();
        periodState.emission = emission;
        emit EmissionUpdated(emission);
    }

    /**
     * @notice Sets initial weight for the gauge
     * @param weight Initial weight value
     */
    function setInitialWeight(uint256 weight) external onlyController {
        uint256 periodDuration = getPeriodDuration();
        uint256 currentTime = block.timestamp;
        uint256 nextPeriodStart = ((currentTime / periodDuration) + 2) * periodDuration;
        
        TimeWeightedAverage.createPeriod(
            periodState.votingPeriod,
            nextPeriodStart,
            periodDuration,
            weight,
            10000 // WEIGHT_PRECISION
        );

        periodState.periodStartTime = nextPeriodStart;
    }

    /**
     * @notice Gets time-weighted average weight
     * @return Current average weight
     */
    function getTimeWeightedWeight() public view override returns (uint256) {
        return periodState.votingPeriod.calculateAverage(block.timestamp);
    }

    /**
     * @notice Gets start of current period
     * @return Current period start timestamp
     */
    function getCurrentPeriodStart() public view returns (uint256) {
        return periodState.periodStartTime;
    }

    /**
     * @notice Updates boost calculation parameters
     * @param _maxBoost Maximum boost multiplier
     * @param _minBoost Minimum boost multiplier
     * @param _boostWindow Time window for boost
     * @dev Only callable by controller
     */
    function setBoostParameters(
        uint256 _maxBoost,
        uint256 _minBoost,
        uint256 _boostWindow
    ) external onlyController {
        boostState.maxBoost = _maxBoost;
        boostState.minBoost = _minBoost;
        boostState.boostWindow = _boostWindow;
    }


    // View functions

    /**
     * @notice Gets latest applicable reward time
     * @return Latest of current time or period end
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish() ? block.timestamp : periodFinish();
    }

    /**
     * @notice Gets end time of current period
     * @return Period end timestamp
     */
    function periodFinish() public view returns (uint256) {
        return lastUpdateTime + getPeriodDuration();
    }

    /**
     * @notice Calculates current reward per token
     * @return Current reward per token value
     */
    function getRewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }

        return rewardPerTokenStored + (
            (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalSupply()
        );
    }

    /**
     * @notice Calculates earned rewards for account
     * @param account Address to calculate earnings for
     * @return Amount of rewards earned
     */
    function earned(address account) public view returns (uint256) {
        return (getUserWeight(account) * 
            (getRewardPerToken() - userStates[account].rewardPerTokenPaid) / 1e18
        ) + userStates[account].rewards;
    }

    /**
     * @notice Gets user's current weight including boost
     * @param account Address to get weight for
     * @return User's current weight
     */
    function getUserWeight(address account) public view virtual returns (uint256) {
        uint256 baseWeight = _getBaseWeight(account);
        return _applyBoost(account, baseWeight);
    }

    /**
     * @notice Creates checkpoint for reward calculations
     */
    function checkpoint() external updateReward(msg.sender) {
        emit Checkpoint(msg.sender, block.timestamp);
    }

    /**
     * @notice Gets duration of reward period
     * @return Period duration in seconds
     */
    function getPeriodDuration() public view virtual returns (uint256) {
        return 7 days; // Default period duration, can be overridden by child contracts
    }

    /**
     * @notice Gets total weight of gauge
     * @return Total gauge weight
     */
    function getTotalWeight() external view virtual override returns (uint256) {
        return totalSupply();
    }

}
