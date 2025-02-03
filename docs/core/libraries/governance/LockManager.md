# LockManager

## Overview

The LockManager is a library designed to manage token lock positions and related calculations.  
It provides creating, modifying, and managing token locks with built-in validation and safety checks.

## Purpose

- Create and manage token lock positions + existing locks
- Track locked token amounts and durations
- Validate lock durations and amounts
- Maintain a state of all locks
- Enforce maximum lock amounts per position and globally

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|---------|------------|
| createLock | Creates a new lock position | Internal | `user`: Address creating the lock<br>`amount`: Amount of tokens to lock<br>`duration`: Duration of the lock in seconds |
| increaseLock | Increases the amount in an existing lock | Internal | `user`: Address increasing their lock<br>`additionalAmount`: Additional amount to lock |
| extendLock | Extends the duration of an existing lock | Internal | `user`: Address extending their lock<br>`extensionDuration`: Additional duration in seconds |
| getLock | Retrieves lock information for an account | Internal View | `account`: Address to query |

## Implementation Details

### Features:

- Data management using Lock and LockState structs
- Event emission for state changes
- Duration validation against minimum and maximum bounds
- Lock existence and expiration checks
- Total locked amount tracking
- Maximum lock amount limits per position and globally
- Time-based lock extension calculations

## Data Structures

### Lock
| Field | Type | Description |
|-------|------|-------------|
| amount | uint256 | Amount of tokens locked |
| end | uint256 | Timestamp when lock expires |
| exists | bool | Flag indicating if lock exists |

### LockState
| Field | Type | Description |
|-------|------|-------------|
| locks | mapping(address => Lock) | User lock positions |
| totalLocked | uint256 | Total amount of tokens locked |
| minLockDuration | uint256 | Minimum allowed lock duration |
| maxLockDuration | uint256 | Maximum allowed lock duration |
| maxTotalLocked | uint256 | Maximum total amount of tokens that can be locked |
| maxLockAmount | uint256 | Maximum amount of tokens that can be locked in a single position |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| LockCreated | Emitted when a new lock is created | `user`: Address of the user<br>`amount`: Amount locked<br>`end`: Lock expiration timestamp |
| LockIncreased | Emitted when tokens are added to a lock | `user`: Address of the user<br>`additionalAmount`: Amount added |
| LockExtended | Emitted when a lock duration is extended | `user`: Address of the user<br>`newEnd`: New expiration timestamp |
| LockWithdrawn | Emitted when locked tokens are withdrawn | `user`: Address of the user<br>`amount`: Amount withdrawn |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidLockDuration | When lock duration is outside allowed range |
| InvalidLockAmount | When lock amount is zero |
| LockNotFound | When attempting to modify non-existent lock |
| LockNotExpired | When attempting to withdraw before lock expiry |
| LockExpired | When attempting to modify expired lock |
| AmountExceedsLimit | When attempting to increase lock amount beyond the maximum limit |

## Usage Notes

- Duration limits (min/max) should be set appropriately for the use case
- Maximum lock amounts per position and globally can be configured in LockState
- Lock operations should be properly validated before calling library functions
- Events should be monitored for tracking lock operations
- The library does not handle token transfers directly; this must be managed by the implementing contract
- Lock amounts are checked against maxLockAmount and maxTotalLocked limits
