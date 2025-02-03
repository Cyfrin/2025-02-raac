// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../interfaces/core/tokens/IveRAACToken.sol";
import "../../libraries/governance/LockManager.sol";
import "../../libraries/governance/BoostCalculator.sol";
import "../../libraries/governance/PowerCheckpoint.sol";
import "../../libraries/governance/VotingPowerLib.sol";


/**
 * @title Vote Escrowed RAAC Token
 * @author RAAC Protocol Team
 * @notice A vote-escrowed token contract that allows users to lock RAAC tokens to receive voting power and boost capabilities
 * @dev Implementation of vote-escrowed RAAC (veRAAC) with time-weighted voting power, emergency controls, governance integration and boost calculations
 * Key features:
 * - Users can lock RAAC tokens for voting power
 * - Voting power decays linearly over time
 * - Includes emergency withdrawal mechanisms
 * - Integrates with governance for proposal voting
 * - Provides boost calculations for rewards
 */
contract veRAACToken is ERC20, Ownable, ReentrancyGuard, IveRAACToken {
    using SafeERC20 for IERC20;
    using LockManager for LockManager.LockState;
    using BoostCalculator for BoostCalculator.BoostState;
    using PowerCheckpoint for PowerCheckpoint.CheckpointState;
    using VotingPowerLib for VotingPowerLib.VotingPowerState;

    // Constants
    /** 
     * @notice Minimum lock duration (1 year) 
    */
    uint256 public constant MIN_LOCK_DURATION = 365 days;
    
    /** 
     * @notice Maximum lock duration (4 years) 
    */
    uint256 public constant MAX_LOCK_DURATION = 1460 days;
    
    /** 
     * @notice Maximum boost multiplier (2.5x in basis points)
    */
    uint256 public constant MAX_BOOST = 25000;
    
    /** 
     * @notice Minimum boost multiplier (1x in basis points) 
    */
    uint256 public constant MIN_BOOST = 10000;
    
    /** 
     * @notice Delay required for emergency actions
    */
    uint256 public constant EMERGENCY_DELAY = 3 days;
    
    /** 
     * @notice Maximum total supply of veRAACToken
    */
    uint256 private constant MAX_TOTAL_SUPPLY = 100_000_000e18; // 100M
    
    /** 
     * @notice Maximum amount that can be locked in a single position
    */
    uint256 private constant MAX_LOCK_AMOUNT = 10_000_000e18;  // 10M
    
    /** 
     * @notice Maximum total amount that can be locked globally
    */
    uint256 public constant MAX_TOTAL_LOCKED_AMOUNT = 1_000_000_000e18; // 1B

    // Emergency action identifiers
    bytes32 private constant EMERGENCY_WITHDRAW_ACTION = keccak256("enableEmergencyWithdraw");
    bytes32 private constant EMERGENCY_UNLOCK_ACTION = keccak256("EMERGENCY_UNLOCK");
    /** 
     * @notice View struct for boost state information
    */
    struct BoostStateView {
        uint256 minBoost; // Minimum boost multiplier in basis points
        uint256 maxBoost; // Maximum boost multiplier in basis points
        uint256 boostWindow; // Time window for boost calculations
        uint256 totalVotingPower; // Total voting power in the system
        uint256 totalWeight; // Total weight of all locks
    }
   
    
    // Core state & Storage
    /** 
     * @notice The RAAC token contract
    */
    IERC20 public immutable raacToken;
    /** 
     * @notice The minter address
    */
    address public minter;
    /** 
     * @notice Whether the contract is paused
    */
    bool public paused;
    /** 
     * @notice Timestamp after which emergency withdrawals are enabled
    */
    uint256 public emergencyWithdrawDelay;
    /** 
     * @notice Whether emergency unlock is enabled
    */
    bool public emergencyUnlockEnabled;
    /** 
     * @notice Mapping of user addresses to their lock positions
    */
    mapping(address => Lock) public locks;

    // Library states
    /** 
     * @notice State for managing lock positions
    */
    LockManager.LockState private _lockState;
    /** 
     * @notice State for managing boost calculations
    */
    BoostCalculator.BoostState private _boostState;
    /** 
     * @notice State for managing checkpoints
    */
    PowerCheckpoint.CheckpointState private _checkpointState;
    /** 
     * @notice State for managing voting power calculations
    */
    VotingPowerLib.VotingPowerState private _votingState;

    // Emergency timelock
    /** 
     * @notice Mapping of action IDs to scheduled times
    */
    mapping(bytes32 => uint256) private _emergencyTimelock;
    /** 
     * @notice Mapping of user addresses to proposals they have voted on
    */
    mapping(address => mapping(uint256 => bool)) private _hasVotedOnProposal;
    /** 
     * @notice Mapping of proposal IDs to their snapshot block numbers
    */
    mapping(uint256 => uint256) public proposalPowerSnapshots;

    // MODIFIERS
    /** 
     * @notice Modifier to check if the contract is not paused
    */
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /** 
     * @notice Modifier to check if the emergency delay is met
    */
    modifier withEmergencyDelay(bytes32 actionId) {
        uint256 scheduleTime = _emergencyTimelock[actionId];
        if (scheduleTime == 0) revert EmergencyActionNotScheduled();
        if (block.timestamp < scheduleTime + EMERGENCY_DELAY) revert EmergencyDelayNotMet();
        _;
        delete _emergencyTimelock[actionId];
    }

    /**
     * @notice Initializes the veRAACToken contract
     * @param _raacToken Address of the RAAC token contract
     * @dev Sets up initial parameters for locks and boost calculations
     */
    constructor(address _raacToken) ERC20("Vote Escrowed RAAC", "veRAAC") Ownable(msg.sender) {
        require(_raacToken != address(0), "Invalid RAAC token address");
        raacToken = IERC20(_raacToken);

        // Initialize lock parameters
        _initializeLockParameters();

        // Initialize boost parameters
        _initializeBoostParameters();
    }
    /**
     * @notice Initializes boost parameters
     * @dev Sets up initial parameters for boost calculations
     */
    function _initializeBoostParameters() internal {
        _boostState.maxBoost = MAX_BOOST;      // 2.5x in basis points (25000)
        _boostState.minBoost = MIN_BOOST;      // 1x in basis points (10000)
        _boostState.boostWindow = 7 days;       // 7 days
        _boostState.baseWeight = 1e18;         // 1e18: starting weight as small as possible
    }

    /**
     * @notice Initializes lock parameters
     * @dev Sets up initial parameters for lock calculations
     */
    function _initializeLockParameters() internal {
        _lockState.minLockDuration = MIN_LOCK_DURATION;  // 365 days
        _lockState.maxLockDuration = MAX_LOCK_DURATION;  // 1460 days (4 years)
        _lockState.maxLockAmount = MAX_LOCK_AMOUNT;      // 10M
        _lockState.maxTotalLocked = MAX_TOTAL_LOCKED_AMOUNT; // 1B
    }

    /**
     * @notice Creates a new lock position for RAAC tokens
     * @dev Locks RAAC tokens for a specified duration and mints veRAAC tokens representing voting power
     * @param amount The amount of RAAC tokens to lock
     * @param duration The duration to lock tokens for, in seconds
     */
    function lock(uint256 amount, uint256 duration) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (amount > MAX_LOCK_AMOUNT) revert AmountExceedsLimit();
        if (totalSupply() + amount > MAX_TOTAL_SUPPLY) revert TotalSupplyLimitExceeded();
        if (duration < MIN_LOCK_DURATION || duration > MAX_LOCK_DURATION) 
            revert InvalidLockDuration();

        // Do the transfer first - this will revert with ERC20InsufficientBalance if user doesn't have enough tokens
        raacToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate unlock time
        uint256 unlockTime = block.timestamp + duration;
        
        // Create lock position
        _lockState.createLock(msg.sender, amount, duration);
        _updateBoostState(msg.sender, amount);

        // Calculate initial voting power
        (int128 bias, int128 slope) = _votingState.calculateAndUpdatePower(
            msg.sender,
            amount,
            unlockTime
        );

        // Update checkpoints
        uint256 newPower = uint256(uint128(bias));
        _checkpointState.writeCheckpoint(msg.sender, newPower);

        // Mint veTokens
        _mint(msg.sender, newPower);

        emit LockCreated(msg.sender, amount, unlockTime);
    }

    /**
     * @notice Increases the amount of locked RAAC tokens
     * @dev Adds more tokens to an existing lock without changing the unlock time
     * @param amount The additional amount of RAAC tokens to lock
     */
    function increase(uint256 amount) external nonReentrant whenNotPaused {
        // Increase lock using LockManager
        _lockState.increaseLock(msg.sender, amount);
        _updateBoostState(msg.sender, locks[msg.sender].amount);

        // Update voting power
        LockManager.Lock memory userLock = _lockState.locks[msg.sender];
        (int128 newBias, int128 newSlope) = _votingState.calculateAndUpdatePower(
            msg.sender,
            userLock.amount + amount,
            userLock.end
        );

        // Update checkpoints
        uint256 newPower = uint256(uint128(newBias));
        _checkpointState.writeCheckpoint(msg.sender, newPower);

        // Transfer additional tokens and mint veTokens
        raacToken.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, newPower - balanceOf(msg.sender));

        emit LockIncreased(msg.sender, amount);
    }

    /**
     * @notice Extends the duration of an existing lock
     * @dev Increases the lock duration which results in updated voting power
     * @param newDuration The new total duration for the lock, in seconds
     */
    function extend(uint256 newDuration) external nonReentrant whenNotPaused {
        // Extend lock using LockManager
        uint256 newUnlockTime = _lockState.extendLock(msg.sender, newDuration);

        // Update voting power
        LockManager.Lock memory userLock = _lockState.locks[msg.sender];
        (int128 newBias, int128 newSlope) = _votingState.calculateAndUpdatePower(
            msg.sender,
            userLock.amount,
            newUnlockTime
        );

        // Update checkpoints
        uint256 oldPower = balanceOf(msg.sender);
        uint256 newPower = uint256(uint128(newBias));
        _checkpointState.writeCheckpoint(msg.sender, newPower);

        // Update veToken balance
        if (newPower > oldPower) {
            _mint(msg.sender, newPower - oldPower);
        } else if (newPower < oldPower) {
            _burn(msg.sender, oldPower - newPower);
        }

        emit LockExtended(msg.sender, newUnlockTime);
    }

    /**
     * @notice Withdraws locked RAAC tokens after lock expiry
     * @dev Burns veRAAC tokens and returns the original RAAC tokens to the user
     */
    function withdraw() external nonReentrant {
        LockManager.Lock memory userLock = _lockState.locks[msg.sender];
        
        if (userLock.amount == 0) revert LockNotFound();
        if (block.timestamp < userLock.end) revert LockNotExpired();

        uint256 amount = userLock.amount;
        uint256 currentPower = balanceOf(msg.sender);

        // Clear lock data
        delete _lockState.locks[msg.sender];
        delete _votingState.points[msg.sender];

        // Update checkpoints
        _checkpointState.writeCheckpoint(msg.sender, 0);

        // Burn veTokens and transfer RAAC
        _burn(msg.sender, currentPower);
        raacToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Schedules an emergency action with required delay
     * @dev Creates a timelock for emergency actions that must wait for EMERGENCY_DELAY
     * @param actionId Unique identifier for the emergency action
     */
    function scheduleEmergencyAction(bytes32 actionId) external onlyOwner {
        _emergencyTimelock[actionId] = block.timestamp;
        emit EmergencyActionScheduled(actionId, block.timestamp + EMERGENCY_DELAY);
    }

    /**
     * @notice Cancels a scheduled emergency action
     * @dev Removes the timelock for a scheduled emergency action
     * @param actionId Unique identifier of the emergency action to cancel
     */
    function cancelEmergencyAction(bytes32 actionId) external onlyOwner {
        delete _emergencyTimelock[actionId];
        emit EmergencyActionCancelled(actionId);
    }

    /**
     * @notice Enables emergency withdrawal functionality
     * @dev Sets the emergency withdrawal delay after which users can withdraw tokens
     */
    function enableEmergencyWithdraw() external onlyOwner withEmergencyDelay(EMERGENCY_WITHDRAW_ACTION) {
        emergencyWithdrawDelay = block.timestamp + EMERGENCY_DELAY;
        emit EmergencyWithdrawEnabled(emergencyWithdrawDelay);
    }

    /**
     * @notice Allows emergency withdrawal of locked tokens
     * @dev Users can withdraw their tokens before lock expiry during emergency
     */
    function emergencyWithdraw() external nonReentrant {
        if (emergencyWithdrawDelay == 0 || block.timestamp < emergencyWithdrawDelay) 
            revert EmergencyWithdrawNotEnabled();
        
        LockManager.Lock memory userLock = _lockState.locks[msg.sender];
        if (userLock.amount == 0) revert NoTokensLocked();
        
        uint256 amount = userLock.amount;
        uint256 currentPower = balanceOf(msg.sender);
        
        delete _lockState.locks[msg.sender];
        delete _votingState.points[msg.sender];
        
        _burn(msg.sender, currentPower);
        raacToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Retrieves voting power for a specific proposal
     * @dev Returns the voting power at the proposal's snapshot block
     * @param account The address to check voting power for
     * @param proposalId The ID of the proposal
     * @return The voting power available for the given proposal
     */
    function getVotingPowerForProposal(
        address account, 
        uint256 proposalId
    ) external view returns (uint256) {
        uint256 snapshotBlock = proposalPowerSnapshots[proposalId];
        if (snapshotBlock == 0) revert InvalidProposal();
        return getPastVotes(account, snapshotBlock);
    }

    /**
     * @notice Records a vote for a proposal
     * @dev Prevents double voting and emits a VoteCast event
     * @param voter The address of the voter
     * @param proposalId The ID of the proposal being voted on
     */
    function recordVote(
        address voter, 
        uint256 proposalId
    ) external {
        if (_hasVotedOnProposal[voter][proposalId]) revert AlreadyVoted();
        _hasVotedOnProposal[voter][proposalId] = true;
        
        uint256 power = getVotingPower(voter);
        emit VoteCast(voter, proposalId, power);
    }

    // View functions
    /**
     * @notice Gets the current voting power for an account
     * @dev Calculates voting power based on lock amount and remaining time
     * @param account The address to check voting power for
     * @return The current voting power of the account
     */
    function getVotingPower(address account) public view returns (uint256) {
        return _votingState.getCurrentPower(account, block.timestamp);
    }

    /**
     * @notice Gets the historical voting power for an account at a specific block
     * @dev Returns the voting power from the checkpoint at or before the requested block
     * @param account The address to check voting power for
     * @param blockNumber The block number to check voting power at
     * @return The voting power the account had at the specified block
     */
    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        return _checkpointState.getPastVotes(account, blockNumber);
    }

    /**
     * @notice Calculates the boost multiplier for a user's rewards
     * @dev Determines boost based on voting power ratio and time-weighted factors
     * @param user The address to calculate boost for
     * @param amount The amount of rewards to apply boost to
     * @return boostBasisPoints The calculated boost multiplier in basis points
     * @return boostedAmount The calculated boosted amount
     */
    function calculateBoost(address user, uint256 amount) external view returns (uint256 boostBasisPoints, uint256 boostedAmount) {
        return _boostState.calculateTimeWeightedBoost(
            balanceOf(user),
            totalSupply(),
            amount
        );
    }

    /**
     * @notice Transfers veRAAC tokens to another address
     * @dev Overrides ERC20 transfer to implement transfer restrictions
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Always reverts as veRAAC tokens are non-transferable
     */
    function transfer(address to, uint256 amount) public virtual override(ERC20, IveRAACToken) returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfers veRAAC tokens from one address to another
     * @dev Overrides ERC20 transferFrom to implement transfer restrictions
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Always reverts as veRAAC tokens are non-transferable
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override(ERC20, IveRAACToken) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Gets the amount of RAAC tokens locked by an account
     * @dev Returns the raw locked token amount without time-weighting
     * @param account The address to check
     * @return The amount of RAAC tokens locked by the account
     */
    function getLockedBalance(address account) external view returns (uint256) {
        return locks[account].amount;
    }

    /**
     * @notice Gets the lock end time for an account
     * @dev Returns the timestamp when the lock expires
     * @param account The address to check
     * @return The unix timestamp when the lock expires
     */
    function getLockEndTime(address account) external view returns (uint256) {
        return locks[account].end;
    }

    /**
     * @notice Gets the voting power for an account at a specific timestamp
     * @dev Calculates time-weighted voting power at the given timestamp
     * @param account The address to check
     * @param timestamp The timestamp to calculate voting power at
     * @return The voting power at the specified timestamp
     */
    function getVotingPower(address account, uint256 timestamp) external view returns (uint256) {
        return _votingState.calculatePowerAtTimestamp(account, timestamp);
    }

    /**
     * @notice Calculates the veRAAC amount for a given lock amount and duration
     * @dev Implements the linear voting power calculation based on lock duration
     * @param amount The amount of RAAC tokens to lock
     * @param lockDuration The duration to lock for
     * @return The resulting veRAAC amount
     */
    function calculateVeAmount(uint256 amount, uint256 lockDuration) external pure returns (uint256) {
        if (amount == 0 || lockDuration == 0) return 0;
        if (lockDuration > MAX_LOCK_DURATION) lockDuration = MAX_LOCK_DURATION;
        
        // Calculate voting power as a linear function of lock duration
        return (amount * lockDuration) / MAX_LOCK_DURATION;
    }

    /**
     * @notice Sets the minter address
     * @dev Can only be called by the contract owner
     * @param _minter The address to set as minter
     */
    function setMinter(address _minter) external override onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        minter = _minter;
        emit MinterSet(_minter);
    }

    /**
     * @notice Internal function to handle token transfers
     * @dev Overrides ERC20 _update to prevent regular transfers
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from == address(0) || to == address(0)) {
            // Allow minting and burning operations
            super._update(from, to, amount);
            return;
        }
        
        // Prevent all other transfers of veRAAC tokens
        revert TransferNotAllowed();
    }

    /**
     * @notice Gets the total voting power of all veRAAC tokens
     * @dev Returns the total supply of veRAAC tokens
     * @return The total voting power across all holders
     */
    function getTotalVotingPower() external view override returns (uint256) {
        return totalSupply();
    }

    function _updateBoostState(address user, uint256 newAmount) internal {
        // Update boost calculator state
        _boostState.votingPower = _votingState.calculatePowerAtTimestamp(user, block.timestamp);
        _boostState.totalVotingPower = totalSupply();
        _boostState.totalWeight = _lockState.totalLocked;
        
        _boostState.updateBoostPeriod();
    }

 
    function getBoostWindow() external view returns (uint256) {
        return _boostState.boostWindow;
    }

    function scheduleEmergencyUnlock() external onlyOwner {
        _emergencyTimelock[EMERGENCY_UNLOCK_ACTION] = block.timestamp;
        emit EmergencyUnlockScheduled();
    }

    function executeEmergencyUnlock() external onlyOwner withEmergencyDelay(EMERGENCY_UNLOCK_ACTION) {
        emergencyUnlockEnabled = true;
        emit EmergencyUnlockEnabled();
    }

    /**
     * @notice Gets the current boost multiplier for an account
     * @dev Returns the current boost value in basis points
     * @param account The address to check boost for
     * @return boostBasisPoints The current boost multiplier in basis points
     * @return boostedAmount The current boosted amount
     */
    function getCurrentBoost(address account) external view returns (uint256 boostBasisPoints, uint256 boostedAmount) {
        return _boostState.calculateTimeWeightedBoost(
            balanceOf(account),
            totalSupply(),
            _lockState.locks[account].amount
        );
    }


    function getBoostState() external view returns (BoostStateView memory) {
        return BoostStateView({
            minBoost: _boostState.minBoost,
            maxBoost: _boostState.maxBoost,
            boostWindow: _boostState.boostWindow,
            totalVotingPower: _boostState.totalVotingPower,
            totalWeight: _boostState.totalWeight
        });
    }
      /**
     * @notice Gets the current lock position for an account
     * @dev Returns the lock amount, end time and current voting power for the given account
     * @param account The address to query
     * @return LockPosition containing amount locked, end time and current voting power
     */
    function getLockPosition(address account) external view override returns (LockPosition memory) {
        LockManager.Lock memory userLock = _lockState.getLock(account);
        return LockPosition({
            amount: userLock.amount,
            end: userLock.end,
            power: balanceOf(account)
        });
    }
}
