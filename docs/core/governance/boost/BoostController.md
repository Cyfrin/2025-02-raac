# BoostController

## Overview

The BoostController is designed to manage boost calculations and delegations for the protocol.
It implements Curve-style boost mechanics with configurable multipliers and supports pool-specific boost management.

## Purpose

- Calculate and manage boost multipliers for users
- Handle boost delegations between users
- Track pool-specific boost metrics
- Provide emergency controls and parameter management
- Integrate with veToken for voting power calculations

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| calculateBoost | Calculates boost for user | External View | `user`: User address<br>`pool`: Pool address<br>`amount`: Base amount | (uint256, uint256): Boost points and amount |
| updateUserBoost | Updates user's boost | External | `user`: User address<br>`pool`: Pool address | None |
| delegateBoost | Delegates boost to another user | External | `to`: Recipient address<br>`amount`: Boost amount<br>`duration`: Duration | None |
| removeBoostDelegation | Removes expired delegation | External | `from`: Delegator address | None |
| getWorkingBalance | Gets user's working balance | External View | `user`: User address<br>`pool`: Pool address | uint256: Working balance |

## Implementation Details

### Features:

- Curve-style boost mechanics (max 2.5x by default)
- Time-weighted boost calculations
- Pool-specific boost tracking
- Boost delegation system
- Role-based access control
- Emergency pause functionality
- Configurable boost parameters

## Data Structures

### UserBoost
| Field | Type | Description |
|-------|------|-------------|
| amount | uint256 | Boost amount |
| expiry | uint256 | Delegation expiry timestamp |
| delegatedTo | address | Delegation recipient |
| lastUpdateTime | uint256 | Last update timestamp |

### PoolBoost
| Field | Type | Description |
|-------|------|-------------|
| totalBoost | uint256 | Total pool boost |
| workingSupply | uint256 | Working supply with boost |
| baseSupply | uint256 | Base supply without boost |
| lastUpdateTime | uint256 | Last update timestamp |

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_BOOST | 25000 | Maximum boost multiplier (2.5x) |
| MIN_BOOST | 10000 | Minimum boost multiplier (1x) |
| MIN_DELEGATION_DURATION | 7 days | Minimum delegation period |
| MAX_DELEGATION_DURATION | 365 days | Maximum delegation period |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| BoostUpdated | When boost is updated | `user`: User address<br>`pool`: Pool address<br>`newBoost`: New boost amount |
| PoolBoostUpdated | When pool boost changes | `pool`: Pool address<br>`totalBoost`: Total boost<br>`workingSupply`: Working supply |
| BoostDelegated | When boost is delegated | `from`: Delegator<br>`to`: Recipient<br>`amount`: Amount<br>`duration`: Duration |
| DelegationRemoved | When delegation ends | `from`: Delegator<br>`to`: Recipient<br>`amount`: Amount |
| EmergencyShutdown | When emergency state changes | `caller`: Admin address<br>`paused`: New state |
| BoostParametersUpdated | When parameters change | `maxBoost`: New max<br>`minBoost`: New min<br>`boostWindow`: New window |
| PoolAdded | When pool is supported | `pool`: Pool address |
| PoolRemoved | When pool is removed | `pool`: Pool address |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidBoostAmount | When boost amount is invalid |
| InvalidDelegationDuration | When duration outside bounds |
| InsufficientVeBalance | When veToken balance too low |
| BoostAlreadyDelegated | When boost already delegated |
| UnauthorizedCaller | When caller lacks permission |
| DelegationNotFound | When delegation doesn't exist |
| MaxBoostExceeded | When boost exceeds maximum |
| EmergencyPaused | When contract is paused |
| InvalidPool | When pool address invalid |
| PoolNotSupported | When pool not in supported list |
| UnsupportedPool | When pool operations not allowed |

## Usage Notes

- Boost calculations based on veToken balance
- Delegations require sufficient veToken balance
- Minimum 7-day delegation period
- Maximum 365-day delegation period
- Maximum 2.5x boost multiplier
- Pool must be supported for boost operations
- Emergency controls can pause all operations
- Role-based access for admin functions
- Time-weighted calculations to aleviate manipulation

## Dependencies

The contract depends on:

- OpenZeppelin's AccessControl for roles
- OpenZeppelin's ReentrancyGuard for security
- OpenZeppelin's Pausable for emergency control
- BoostCalculator library for calculations
- veRAACToken for voting power tracking