// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

import "../../../interfaces/core/governance/proposals/ITimelockController.sol";

/**
 * @title TimelockController
 * @author RAAC Protocol Team
 * @notice Manages time-delayed execution of governance proposals with role-based access control
 * @dev Implements a timelock mechanism with configurable delays, role-based permissions,
 *      and emergency procedures for protocol governance
 */
contract TimelockController is ITimelockController, AccessControl, ReentrancyGuard {
    using SafeCast for uint256;

    // State variables
    uint256 private _minDelay;
    uint256 private _maxDelay;
    mapping(bytes32 => Operation) private _operations;
    mapping(bytes32 => bool) private _emergencyActions;

    /// @notice Role identifier for proposing new operations
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    /// @notice Role identifier for executing queued operations
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    /// @notice Role identifier for cancelling operations
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    /// @notice Role identifier for emergency actions
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /// @notice Minimum timelock delay (2 days)
    uint256 public constant MIN_DELAY = 2 days;
    /// @notice Maximum timelock delay (30 days)
    uint256 public constant MAX_DELAY = 30 days;
    /// @notice Grace period for executing operations after delay (14 days)
    uint256 public constant GRACE_PERIOD = 14 days;
    /// @notice Delay for emergency actions (1 day)
    uint256 public constant EMERGENCY_DELAY = 1 days;


    /**
     * @notice Initializes the TimelockController contract
     * @dev Sets up initial roles and delay parameters
     * @param initialMinDelay Initial timelock delay
     * @param proposers Initial addresses with proposer role
     * @param executors Initial addresses with executor role
     * @param admin Address to receive all roles
     */
    constructor(
        uint256 initialMinDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) {
        if (initialMinDelay < MIN_DELAY || initialMinDelay > MAX_DELAY) {
            revert InvalidDelay(initialMinDelay);
        }

        _minDelay = initialMinDelay;
        _maxDelay = MAX_DELAY;

        // Grant admin roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
        _grantRole(CANCELLER_ROLE, admin);

        // Setup roles for proposers
        for (uint256 i = 0; i < proposers.length; i++) {
            _grantRole(PROPOSER_ROLE, proposers[i]);
        }

        // Setup roles for executors
        for (uint256 i = 0; i < executors.length; i++) {
            _grantRole(EXECUTOR_ROLE, executors[i]);
        }
    }

    /**
     * @notice Returns whether an operation is pending
     * @param id Operation ID to check
     * @return True if operation is pending
     */
    function isOperationPending(
        bytes32 id
    ) public view override returns (bool) {
        Operation storage op = _operations[id];
        return op.timestamp != 0 && !op.executed;
    }

    /**
     * @notice Returns whether an operation is done (executed)
     * @param id Operation ID to check
     * @return True if operation is done
     */
    function isOperationDone(bytes32 id) public view returns (bool) {
        return _operations[id].executed;
    }

    /**
     * @notice Schedules a batch of operations
     * @dev Only callable by addresses with PROPOSER_ROLE
     * @param targets Target addresses for calls
     * @param values ETH values for calls
     * @param calldatas Calldata for calls
     * @param predecessor ID of operation that must be executed before
     * @param salt Random value for operation ID
     * @param delay Timelock delay for this operation
     * @return id Operation ID
     */
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external override onlyRole(PROPOSER_ROLE) returns (bytes32) {
        // Input validation: check if the number of targets, values, and calldatas are the same
        if (targets.length == 0 || targets.length != values.length || targets.length != calldatas.length) {
            revert InvalidTargetCount();
        }

        // Check if the delay is within the allowed range
        if (delay < _minDelay || delay > _maxDelay) {
            revert InvalidDelay(delay);
        }

        // Check predecessor if specified
        if (predecessor != bytes32(0)) {
            if (!isOperationDone(predecessor) && !isOperationPending(predecessor)) {
                revert PredecessorNotExecuted(predecessor);
            }
        }

        bytes32 id = hashOperationBatch(targets, values, calldatas, predecessor, salt);
        if (_operations[id].timestamp != 0) revert OperationAlreadyScheduled(id);
        
        uint256 timestamp = block.timestamp + delay;
        _operations[id] = Operation({
            timestamp: timestamp.toUint64(),
            executed: false
        });

        emit OperationScheduled(id, targets, values, calldatas, predecessor, salt, delay);

        return id;
    }

    /**
     * @notice Executes a scheduled operation
     * @dev Only callable by addresses with EXECUTOR_ROLE
     * @param targets Target addresses for calls
     * @param values ETH values for calls
     * @param calldatas Calldata for calls
     * @param predecessor ID of operation that must be executed before
     * @param salt Random value for operation ID
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) external override payable nonReentrant onlyRole(EXECUTOR_ROLE) {
        bytes32 id = hashOperationBatch(targets, values, calldatas, predecessor, salt);
        
        // Check operation status
        Operation storage op = _operations[id];
        if (op.timestamp == 0) revert OperationNotFound(id);
        if (op.executed) revert OperationAlreadyExecuted(id);
        
        // Check timing conditions
        if (block.timestamp < op.timestamp) revert OperationNotReady(id);
        if (block.timestamp > op.timestamp + GRACE_PERIOD) revert OperationExpired(id);
        
        // Check predecessor if specified
        if (predecessor != bytes32(0)) {
            if (!isOperationDone(predecessor)) {
                revert PredecessorNotExecuted(predecessor);
            }
        }

        // Mark as executed before external calls
        op.executed = true;

        // Execute each call
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) {
                revert CallReverted(id, i);
            }
        }

        emit OperationExecuted(id, targets, values, calldatas, predecessor, salt);
    }

    /**
     * @notice Cancels a scheduled operation
     * @dev Only callable by addresses with CANCELLER_ROLE
     * @param id Operation ID to cancel
     */
    function cancel(bytes32 id) external override onlyRole(CANCELLER_ROLE) {
        if (_operations[id].timestamp == 0) {
            revert OperationNotFound(id);
        }
        if (_operations[id].executed) {
            revert OperationAlreadyScheduled(id);
        }
        
        delete _operations[id];
        emit OperationCancelled(id);
    }

    /**
     * @notice Schedules an emergency action
     * @dev Only callable by addresses with EMERGENCY_ROLE
     * @param id Operation ID for the emergency action
     */
    function scheduleEmergencyAction(bytes32 id) external onlyRole(EMERGENCY_ROLE) {
        _emergencyActions[id] = true;
        emit EmergencyActionScheduled(id, block.timestamp);
    }

    /**
     * @notice Executes an emergency action
     * @dev Only callable by addresses with EMERGENCY_ROLE
     * @param targets Target addresses for emergency calls
     * @param values ETH values for emergency calls
     * @param calldatas Calldata for emergency calls
     * @param predecessor ID of operation that must be executed before
     * @param salt Random value for operation ID
     */
    function executeEmergencyAction(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) external payable onlyRole(EMERGENCY_ROLE) nonReentrant {
        bytes32 id = hashOperationBatch(targets, values, calldatas, predecessor, salt);
        if (!_emergencyActions[id]) revert EmergencyActionNotScheduled(id);
        
        delete _emergencyActions[id];
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) {
                if (returndata.length > 0) {
                    assembly {
                        let returndata_size := mload(returndata)
                        revert(add(32, returndata), returndata_size)
                    }
                }
                revert CallReverted(id, i);
            }
        }

        emit EmergencyActionExecuted(id);
    }

    /**
     * @notice Returns whether an operation is ready for execution
     * @param id Operation ID to check
     * @return True if operation can be executed
     */
    function isOperationReady(bytes32 id) public view override returns (bool) {
        Operation memory op = _operations[id];
        return op.timestamp > 0 && 
               !op.executed && 
               block.timestamp >= op.timestamp &&
               block.timestamp <= op.timestamp + GRACE_PERIOD;
    }

    /**
     * @notice Returns the timestamp for an operation
     * @param id Operation ID to check
     * @return Timestamp when operation will be ready
     */
    function getTimestamp(bytes32 id) external view override returns (uint256) {
        return _operations[id].timestamp;
    }

    /**
     * @notice Returns the minimum delay for operations
     * @return Current minimum delay
     */
    function getMinDelay() external view override returns (uint256) {
        return _minDelay;
    }

    /**
     * @notice Updates the minimum timelock delay
     * @dev Only callable by addresses with DEFAULT_ADMIN_ROLE
     * @param newDelay New minimum delay
     */
    function updateDelay(uint256 newDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newDelay < MIN_DELAY || newDelay > MAX_DELAY) {
            revert InvalidDelay(newDelay);
        }
        uint256 oldDelay = _minDelay;
        _minDelay = newDelay;
        emit MinDelayChange(oldDelay, newDelay);
    }

    /**
     * @notice Hashes an operation for unique identification
     * @param targets Target addresses for calls
     * @param values ETH values for calls
     * @param calldatas Calldata for calls
     * @param predecessor ID of operation that must be executed before
     * @param salt Random value for operation ID
     * @return Operation hash
     */
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(targets, values, calldatas, predecessor, salt));
    }
}
