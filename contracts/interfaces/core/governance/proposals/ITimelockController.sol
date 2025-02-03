// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ITimelockController
 * @author RAAC Protocol Team
 * @notice Interface for the timelock controller that manages delayed execution of governance actions
 * @dev Implements time-delayed execution mechanics with role-based access control
 * Key features:
 * - Configurable time delays for actions
 * - Batch transaction support
 * - Emergency action system
 * - Operation state tracking
 * - Role-based access control
 */
interface ITimelockController {
    /**
     * @notice Struct containing operation execution details
     * @param timestamp Time when operation can be executed
     * @param executed Whether operation has been executed
     */
    struct Operation {
        uint64 timestamp;
        bool executed;
    }

    /**
     * @notice Emitted when an operation is scheduled
     * @param id Operation identifier
     * @param targets Target addresses for calls
     * @param values ETH values for calls
     * @param calldatas Function call data
     * @param predecessor Required operation to execute first
     * @param salt Random value for operation ID
     * @param delay Time delay before execution
     */
    event OperationScheduled(
        bytes32 indexed id,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    );

    /**
     * @notice Emitted when an operation is executed
     * @param id Operation identifier
     * @param targets Target addresses that were called
     * @param values ETH values that were sent
     * @param calldatas Function call data that was executed
     * @param predecessor Operation that was required first
     * @param salt Random value used for operation ID
     */
    event OperationExecuted(
        bytes32 indexed id,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        bytes32 predecessor,
        bytes32 salt
    );

    /**
     * @notice Emitted when an operation is cancelled
     * @param id Operation identifier
     */
    event OperationCancelled(bytes32 indexed id);

    /**
     * @notice Emitted when minimum delay is changed
     * @param oldDelay Previous delay value
     * @param newDelay New delay value
     */
    event MinDelayChange(uint256 oldDelay, uint256 newDelay);

    /**
     * @notice Emitted when emergency action is scheduled
     * @param id Emergency action identifier
     * @param timestamp Time when action was scheduled
     */
    event EmergencyActionScheduled(bytes32 indexed id, uint256 timestamp);

    /**
     * @notice Emitted when emergency action is executed
     * @param id Emergency action identifier
     */
    event EmergencyActionExecuted(bytes32 indexed id);

    /**
     * @notice Schedules a batch of transactions for future execution
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param calldatas Array of function call data
     * @param predecessor Operation that must be executed before this one
     * @param salt Random value to ensure unique operation IDs
     * @param delay Time delay before execution is allowed
     * @return bytes32 Operation identifier
     */
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external returns (bytes32);

    /**
     * @notice Executes a scheduled batch of transactions
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param calldatas Array of function call data
     * @param predecessor Operation that must be executed first
     * @param salt Salt value used when scheduling
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) external payable;

    /**
     * @notice Cancels a scheduled operation
     * @param id Operation identifier
     */
    function cancel(bytes32 id) external;

    /**
     * @notice Checks if an operation is pending execution
     * @param id Operation identifier
     * @return bool True if operation is pending
     */
    function isOperationPending(bytes32 id) external view returns (bool);

    /**
     * @notice Checks if an operation is ready for execution
     * @param id Operation identifier
     * @return bool True if operation can be executed
     */
    function isOperationReady(bytes32 id) external view returns (bool);

    /**
     * @notice Checks if an operation has been executed
     * @param id Operation identifier
     * @return bool True if operation is done
     */
    function isOperationDone(bytes32 id) external view returns (bool);

    /**
     * @notice Gets the timestamp when operation can be executed
     * @param id Operation identifier
     * @return uint256 Execution timestamp
     */
    function getTimestamp(bytes32 id) external view returns (uint256);

    /**
     * @notice Gets the minimum delay required for operations
     * @return uint256 Minimum delay in seconds
     */
    function getMinDelay() external view returns (uint256);

    /**
     * @notice Schedules an emergency action
     * @param id Emergency action identifier
     */
    function scheduleEmergencyAction(bytes32 id) external;

    /**
     * @notice Executes a scheduled emergency action
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param calldatas Array of function call data
     * @param predecessor Required predecessor operation
     * @param salt Salt value used when scheduling
     */
    function executeEmergencyAction(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) external payable;

    /**
     * @notice Updates the minimum delay for operations
     * @param newDelay New minimum delay in seconds
     */
    function updateDelay(uint256 newDelay) external;

    /**
     * @notice Computes the operation identifier for a batch
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param calldatas Array of function call data
     * @param predecessor Required predecessor operation
     * @param salt Random value for uniqueness
     * @return bytes32 Operation identifier
     */
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) external pure returns (bytes32);

    /* ========== ERRORS ========== */

    /// @notice Thrown when delay is outside valid range
    error InvalidDelay(uint256 delay);

    /// @notice Thrown when operation does not exist
    error OperationNotFound(bytes32 id);

    /// @notice Thrown when operation is already scheduled
    error OperationAlreadyScheduled(bytes32 id);

    /// @notice Thrown when operation delay has not elapsed
    error OperationNotReady(bytes32 id);

    /// @notice Thrown when operation grace period has expired
    error OperationExpired(bytes32 id);

    /// @notice Thrown when predecessor operation not executed
    error PredecessorNotExecuted(bytes32 predecessor);

    /// @notice Thrown when emergency action not scheduled
    error EmergencyActionNotScheduled(bytes32 id);

    /// @notice Thrown when emergency delay not met
    error EmergencyDelayNotMet(bytes32 id);

    /// @notice Thrown when target arrays have invalid length
    error InvalidTargetCount();

    /// @notice Thrown when call to target reverts
    error CallReverted(bytes32 id, uint256 index);

    /// @notice Thrown when targets array is invalid
    error InvalidTargets();

    /// @notice Thrown when values array is invalid
    error InvalidValues();

    /// @notice Thrown when calldatas array is invalid
    error InvalidCalldatas();

    /// @notice Thrown when caller not authorized for emergency action
    error EmergencyActionNotAuthorized(address caller);

    /// @notice Thrown when emergency action already scheduled
    error EmergencyActionAlreadyScheduled(bytes32 id);

    /// @notice Thrown when emergency action delay not met
    error EmergencyActionDelayNotMet(bytes32 id);

    /// @notice Thrown when operation already executed
    error OperationAlreadyExecuted(bytes32 id);
}
