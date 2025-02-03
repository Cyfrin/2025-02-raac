// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IveRAACToken
 * @notice Interface for the vote-escrowed RAAC token contract that manages token locking and voting power
 * @dev Implements vote-escrowed mechanics with time-weighted voting power
 */
interface IveRAACToken {
    /**
     * @notice Struct to track a user's complete lock position including voting power
     * @param amount The amount of RAAC tokens locked
     * @param end The unlock timestamp
     * @param power The current voting power of the position
     */
    struct LockPosition {
        uint256 amount;
        uint256 end;
        uint256 power;
    }

    /**
     * @notice Struct to track basic lock data
     * @param amount The amount of RAAC tokens locked
     * @param end The unlock timestamp
     */
    struct Lock {
        uint256 amount;
        uint256 end;
    }

    /**
     * @notice Creates a new lock position by depositing RAAC tokens
     * @param amount The amount of RAAC tokens to lock
     * @param duration The duration to lock tokens for in seconds
     */
    function lock(uint256 amount, uint256 duration) external;

    /**
     * @notice Extends the duration of an existing lock
     * @param newDuration The new duration to extend the lock to
     */
    function extend(uint256 newDuration) external;

    /**
     * @notice Increases the amount of tokens in an existing lock
     * @param amount The additional amount of RAAC tokens to lock
     */
    function increase(uint256 amount) external;

    /**
     * @notice Withdraws locked tokens after lock expiry
     */
    function withdraw() external;

    /**
     * @notice Gets the complete lock position for an account
     * @param account The address to query
     * @return The lock position containing amount, end time and voting power
     */
    function getLockPosition(address account) external view returns (LockPosition memory);

    /**
     * @notice Sets the minter address
     * @param minter The address to set as minter
     */
    function setMinter(address minter) external;

    /**
     * @notice Calculates the veRAACToken amount for given lock parameters
     * @param amount The amount of RAAC tokens to lock
     * @param lockDuration The duration to lock for
     * @return The resulting veRAACToken amount
     */
    function calculateVeAmount(uint256 amount, uint256 lockDuration) external pure returns (uint256);

    /**
     * @notice Transfers veRAACTokens to another address (always reverts)
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Always reverts as veRAACTokens are non-transferable
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Transfers veRAACTokens from one address to another (always reverts)
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Always reverts as veRAACTokens are non-transferable
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Gets the total voting power of all veRAACTokens
     * @return The total voting power across all holders
     */
    function getTotalVotingPower() external view returns (uint256);

    /**
     * @notice Gets the current voting power for an account
     * @param account The address to check voting power for
     * @return The current voting power of the account
     */
    function getVotingPower(address account) external view returns (uint256);

    /**
     * @notice Gets the voting power for an account at a specific timestamp
     * @param account The address to check voting power for
     * @param timestamp The timestamp to calculate voting power at
     * @return The voting power at the specified timestamp
     */
    function getVotingPower(address account, uint256 timestamp) external view returns (uint256);

    /**
     * @notice Emitted when tokens are locked
     * @param user The address of the user
     * @param amount The amount of tokens locked
     * @param lockDuration The duration tokens are locked for
     */
    event Locked(address indexed user, uint256 amount, uint256 lockDuration);

    /**
     * @notice Emitted when tokens are withdrawn
     * @param user The address of the user
     * @param amount The amount of tokens withdrawn
     */
    event Withdrawn(address indexed user, uint256 amount);

     // Events
    /**
     * @notice Emitted when a user creates a new lock
     * @dev Triggered when tokens are first locked by a user
     * @param user The address of the user
     * @param amount The amount of tokens locked
     * @param unlockTime The timestamp when tokens can be withdrawn
     */
    event LockCreated(address indexed user, uint256 amount, uint256 unlockTime);

    /**
     * @notice Emitted when a user increases their locked amount
     * @dev Triggered when additional tokens are added to an existing lock
     * @param user The address of the user
     * @param additionalAmount The additional amount locked
     */
    event LockIncreased(address indexed user, uint256 additionalAmount);

    /**
     * @notice Emitted when a user extends their lock duration
     * @dev Triggered when the lock duration is extended
     * @param user The address of the user
     * @param newUnlockTime The new unlock timestamp
     */
    event LockExtended(address indexed user, uint256 newUnlockTime);

    /**
     * @notice Emitted when the minter address is set
     * @dev Triggered when owner updates the minter address
     * @param minter The address of the minter
     */
    event MinterSet(address indexed minter);

    /**
     * @notice Emitted when an emergency action is scheduled
     * @dev Triggered when owner schedules an emergency action
     * @param actionId The ID of the emergency action
     * @param executeTime The timestamp when the action can be executed
     */
    event EmergencyActionScheduled(bytes32 indexed actionId, uint256 executeTime);

    /**
     * @notice Emitted when an account casts a vote on a proposal
     * @dev Triggered when a vote is recorded for a proposal
     * @param voter The address of the voter
     * @param proposalId The ID of the proposal
     * @param power The voting power used
     */
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint256 power);

    /**
     * @notice Emitted when emergency withdrawal is enabled
     * @dev Triggered when owner enables emergency withdrawals
     * @param withdrawTime The timestamp when emergency withdrawals become available
     */
    event EmergencyWithdrawEnabled(uint256 withdrawTime);

    /**
     * @notice Emitted when tokens are withdrawn through emergency withdrawal
     * @dev Triggered when a user performs an emergency withdrawal
     * @param user The address of the user
     * @param amount The amount withdrawn
     */
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    /**
     * @notice Emitted when an emergency action is cancelled
     * @dev Triggered when owner cancels a scheduled emergency action
     * @param actionId The ID of the cancelled action
     */
    event EmergencyActionCancelled(bytes32 indexed actionId);

    /**
     * @notice Emitted when emergency unlock is enabled
     * @dev Triggered when owner enables emergency unlock
     */
    event EmergencyUnlockEnabled();

    /**
     * @notice Emitted when emergency unlock is scheduled
     * @dev Triggered when owner schedules emergency unlock
     */
    event EmergencyUnlockScheduled();

    // Errors
    /**
     * @notice Thrown when a zero amount is provided
     * @dev Used to validate non-zero amounts in operations
     */
    error InvalidAmount();

    /**
     * @notice Thrown when a zero address is provided
     * @dev Used to validate non-zero addresses in operations
     */
    error InvalidAddress();

    /**
     * @notice Thrown when an account attempts to vote twice on a proposal
     * @dev Used to prevent double voting
     */
    error AlreadyVoted();

    /**
     * @notice Thrown when an invalid proposal ID is provided
     * @dev Used when proposal does not exist or is not active
     */
    error InvalidProposal();

    /**
     * @notice Thrown when emergency withdrawal is not enabled
     * @dev Used when attempting emergency withdrawal before it's enabled
     */
    error EmergencyWithdrawNotEnabled();

    /**
     * @notice Thrown when emergency delay period has not passed
     * @dev Used for emergency action timing validation
     */
    error EmergencyDelayNotMet();

    /**
     * @notice Thrown when attempting to execute an unscheduled emergency action
     * @dev Used to ensure proper scheduling of emergency actions
     */
    error EmergencyActionNotScheduled();

    /**
     * @notice Thrown when contract is paused
     * @dev Used to prevent operations while contract is paused
     */
    error ContractPaused();

    /**
     * @notice Thrown when attempting to withdraw before lock expiry
     * @dev Used to enforce lock duration
     */
    error LockNotExpired();

    /**
     * @notice Thrown when attempting operations with no locked tokens
     * @dev Used to validate lock existence
     */
    error NoTokensLocked();

    /**
     * @notice Thrown when amount exceeds allowed limit
     * @dev Used to enforce maximum lock amounts
     */
    error AmountExceedsLimit();

    /**
     * @notice Thrown when total supply would exceed maximum
     * @dev Used to enforce maximum total supply
     */
    error TotalSupplyLimitExceeded();

    /**
     * @notice Thrown when lock duration is invalid
     * @dev Used to enforce minimum and maximum lock durations
     */
    error InvalidLockDuration();

    /**
     * @notice Thrown when a zero amount is provided
     * @dev Used to validate non-zero amounts in operations
     */
    error ZeroAmount();

    /**
     * @notice Thrown when no existing lock is present
     * @dev Used to validate lock existence
     */
    error NoExistingLock();

    /**
     * @notice Thrown when emergency unlock is not enabled
     * @dev Used when attempting emergency unlock before it's enabled
     */
    error EmergencyUnlockNotEnabled();

    /**
     * @notice Thrown when emergency unlock is not scheduled
     * @dev Used when attempting emergency unlock before it's scheduled
     */
    error EmergencyUnlockNotScheduled();

    /**
     * @notice Thrown when attempting to operate on a non-existent lock
     * @dev Used when trying to withdraw or modify a lock that doesn't exist
     */
    error LockNotFound();

    /**
     * @notice Thrown when attempting to transfer veRAAC tokens
     * @dev veRAAC tokens are non-transferable
     */
    error TransferNotAllowed();
}