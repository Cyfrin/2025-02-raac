// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TimelockTestTarget
 * @dev Mock contract used for testing Timelock operations
 * Simulates a target contract that can receive and execute delayed operations
 */
contract TimelockTestTarget {
    uint256 public value;
    mapping(bytes32 => bool) public operationExecuted;
    event ValueUpdated(uint256 oldValue, uint256 newValue);
    event OperationExecuted(bytes32 operationId);

    function setValue(uint256 newValue) external {
        uint256 oldValue = value;
        value = newValue;
        emit ValueUpdated(oldValue, newValue);
    }

    function executeOperation(bytes32 operationId) external {
        require(!operationExecuted[operationId], "Operation already executed");
        operationExecuted[operationId] = true;
        emit OperationExecuted(operationId);
    }
}
