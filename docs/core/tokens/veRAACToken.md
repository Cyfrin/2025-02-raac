# veRAACToken

## Overview

The veRAACToken is a governance token implementation that allows users to lock RAAC tokens for voting power and boost capabilities.  
It features time-weighted voting power, emergency controls, and integration with the protocol's governance system.

## Purpose

- Enable time-weighted voting power through token locking
- Provide boost calculations for protocol rewards
- Implement governance voting mechanisms
- Manage emergency controls and withdrawals
- Track voting power through checkpoints

## Access Control

The contract implements role-based access control:

| Role | Description |
|------|-------------|
| Owner | Can manage emergency controls and set minter |
| Minter | Can perform minting operations |
| Users | Can lock tokens and participate in governance |

## Key Functions/Structures

### Lock Structure
| Name | Type | Description |
|------|------|-------------|
| amount | uint256 | Amount of RAAC tokens locked |
| end | uint256 | Timestamp when lock expires |

### Core Functions
| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| lock | Creates new lock position | Any | `amount`: uint256, `duration`: uint256 |
| increase | Adds tokens to existing lock | Any | `amount`: uint256 |
| extend | Extends lock duration | Any | `newDuration`: uint256 |
| withdraw | Withdraws expired lock | Any | None |
| getVotingPower | Gets current voting power | View | `account`: address |
| calculateBoost | Calculates boost multiplier | View | `user`: address, `amount`: uint256 |

## Implementation Details

The component implements:

- Linear voting power decay over time
- Boost calculations based on lock duration
- Checkpoint system for historical voting power
- Emergency controls with timelock
- Non-transferable token mechanics

Constants:
- MIN_LOCK_DURATION: 365 days
- MAX_LOCK_DURATION: 1460 days (4 years)
- MAX_BOOST: 25000 (2.5x)
- MIN_BOOST: 10000 (1x)
- EMERGENCY_DELAY: 3 days
- MAX_TOTAL_SUPPLY: 100M tokens
- MAX_LOCK_AMOUNT: 10M tokens
- MAX_TOTAL_LOCKED_AMOUNT: 1B tokens

Dependencies:
- OpenZeppelin: ERC20, Ownable, ReentrancyGuard
- Custom libraries: LockManager, BoostCalculator, PowerCheckpoint, VotingPowerLib

## Events

| Name | Description |
|------|-------------|
| LockCreated | Emitted when new lock is created |
| LockIncreased | Emitted when lock amount is increased |
| LockExtended | Emitted when lock duration is extended |
| Withdrawn | Emitted when tokens are withdrawn |
| EmergencyWithdrawn | Emitted during emergency withdrawal |
| VoteCast | Emitted when vote is cast |
| EmergencyActionScheduled | Emitted when emergency action is scheduled |
| EmergencyUnlockScheduled | Emitted when emergency unlock is scheduled |

## Error Conditions

| Name | Description |
|------|-------------|
| InvalidAmount | Zero or excessive amount provided |
| InvalidLockDuration | Lock duration outside allowed range |
| LockNotFound | No existing lock for operation |
| LockNotExpired | Attempting early withdrawal |
| TransferNotAllowed | Attempt to transfer veRAACToken |
| EmergencyDelayNotMet | Emergency action before delay |
| ContractPaused | Operations during pause |
| AlreadyVoted | Double voting attempt |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy RAAC token
   - Deploy veRAACToken with RAAC address
   - Initialize boost parameters
   - Set up roles

2. Test Categories:
   - Lock mechanism functionality
   - Voting power calculations
   - Boost calculations
   - Emergency controls
   - Governance integration
   - Access control verification
   - Time-based operations

## Notes

- Voting power decays linearly with time
- Locks require minimum 1-year duration
- Maximum lock duration is 4 years
- Boost multiplier ranges from 1x to 2.5x
- Emergency actions require 3-day delay
- Tokens are non-transferable
- Checkpoints track historical voting power