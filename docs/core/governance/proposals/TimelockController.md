# TimelockController

## Overview

The TimelockController is designed to manage time-delayed execution of governance proposals with role-based access control.
It implements a timelock mechanism with configurable delays and supports both standard and emergency operations.

## Purpose

- Manage time-delayed execution of governance proposals
- Provide role-based access control for operations
- Support emergency actions with shorter delays
- Enable sequential execution through predecessor system
- Ensure secure and controlled governance changes

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| scheduleBatch | Schedules batch operations | PROPOSER_ROLE | `targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Call data<br>`predecessor`: Prior operation ID<br>`salt`: Random value<br>`delay`: Time delay | bytes32: Operation ID |
| executeBatch | Executes scheduled operations | EXECUTOR_ROLE | `targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Call data<br>`predecessor`: Prior operation ID<br>`salt`: Random value | None |
| scheduleEmergencyAction | Schedules emergency action | EMERGENCY_ROLE | `id`: Operation ID | None |
| executeEmergencyAction | Executes emergency action | EMERGENCY_ROLE | `targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Call data<br>`predecessor`: Prior operation ID<br>`salt`: Random value | None |
| cancel | Cancels scheduled operation | CANCELLER_ROLE | `id`: Operation ID | None |

## Implementation Details

### Features:

- Role-based access control system
- Configurable timelock delays
- Emergency action support
- Operation predecessor system
- Batch operation execution
- Grace period for execution
- Operation status tracking

## Data Structures

### Operation
| Field | Type | Description |
|-------|------|-------------|
| timestamp | uint64 | Execution timestamp |
| executed | bool | Execution status |

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MIN_DELAY | 2 days | Minimum timelock delay |
| MAX_DELAY | 30 days | Maximum timelock delay |
| GRACE_PERIOD | 14 days | Execution grace period |
| EMERGENCY_DELAY | 1 day | Emergency action delay |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| OperationScheduled | When operation scheduled | `id`: Operation ID<br>`targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Call data<br>`predecessor`: Prior operation<br>`salt`: Random value<br>`delay`: Time delay |
| OperationExecuted | When operation executed | `id`: Operation ID<br>`targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Call data<br>`predecessor`: Prior operation<br>`salt`: Random value |
| OperationCancelled | When operation cancelled | `id`: Operation ID |
| MinDelayChange | When delay updated | `oldDelay`: Previous delay<br>`newDelay`: New delay |
| EmergencyActionScheduled | When emergency scheduled | `id`: Operation ID<br>`timestamp`: Schedule time |
| EmergencyActionExecuted | When emergency executed | `id`: Operation ID |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidDelay | When delay outside bounds |
| OperationNotFound | When operation doesn't exist |
| OperationAlreadyScheduled | When operation already exists |
| OperationNotReady | When execution time not reached |
| OperationExpired | When grace period expired |
| PredecessorNotExecuted | When predecessor not complete |
| EmergencyActionNotScheduled | When emergency action not found |
| InvalidTargetCount | When target arrays mismatched |
| CallReverted | When operation call fails |
| OperationAlreadyExecuted | When operation already done |

## Usage Notes

- Operations require minimum 2-day delay
- Maximum delay of 30 days
- 14-day grace period for execution
- Emergency actions have 1-day delay
- Predecessor system for sequential execution
- Role-based permissions for all actions
- Batch operations must have matching arrays
- ETH transfers supported in operations
- Operation IDs are deterministic hashes

## Dependencies

The contract depends on:

- OpenZeppelin's AccessControl for roles
- OpenZeppelin's ReentrancyGuard for security
- OpenZeppelin's SafeCast for uint64 casting
- ITimelockController interface