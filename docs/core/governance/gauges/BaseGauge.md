# BaseGauge

## Overview

The BaseGauge is an abstract contract that serves as the base implementation for RWA and RAAC gauges.
It handles reward distribution with boost multipliers and implements core gauge functionality.

## Purpose

- Manage reward distribution with boost multipliers
- Track time-weighted averages for rewards
- Handle user reward claims and updates
- Provide emergency controls and access management
- Calculate and apply boost multipliers
- Track user and gauge weights

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| getReward | Claims accumulated rewards | External | None | None |
| notifyRewardAmount | Updates reward distribution | External (Controller) | `amount`: Reward amount | None |
| earned | Calculates earned rewards | External View | `account`: User address | uint256: Earned amount |
| getUserWeight | Gets user's current weight | External View | `account`: User address | uint256: Weight |
| getRewardPerToken | Gets current reward rate | External View | None | uint256: Reward per token |

## Implementation Details

### Features:

- Time-weighted reward distribution
- Boost multiplier system
- Emergency pause functionality
- Role-based access control
- Reward rate management
- Weight tracking system
- Slippage protection

## Data Structures

### UserState
| Field | Type | Description |
|-------|------|-------------|
| lastUpdateTime | uint256 | Last reward update time |
| rewardPerTokenPaid | uint256 | Stored reward per token |
| rewards | uint256 | Accumulated rewards |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_SLIPPAGE | 100 | Maximum allowed slippage (1%) |
| WEIGHT_PRECISION | 10000 | Precision for weight calculations |
| MAX_REWARD_RATE | 1000000e18 | Maximum reward rate |
| MIN_CLAIM_INTERVAL | 1 days | Minimum time between claims |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| RewardPaid | When rewards are claimed | `user`: User address<br>`reward`: Amount claimed |
| DistributionCapUpdated | When cap is updated | `newCap`: New cap value |
| Checkpoint | When checkpoint created | `user`: User address<br>`timestamp`: Time |
| RewardUpdated | When rewards updated | `user`: User address<br>`reward`: New amount |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| UnauthorizedCaller | When caller lacks required role |
| ClaimTooFrequent | When claiming too frequently |
| ExcessiveRewardRate | When rate exceeds maximum |
| InsufficientBalance | When contract lacks rewards |

## Access Control Roles

| Role | Description |
|------|-------------|
| CONTROLLER_ROLE | Can notify rewards and manage distribution |
| EMERGENCY_ADMIN | Can pause contract operations |
| FEE_ADMIN | Can update distribution caps |

## Usage Notes

- Rewards distributed based on user weights
- Boost multipliers affect reward earnings
- Minimum 1 day between reward claims
- Maximum reward rate prevents overflow
- Emergency pause stops all operations
- Time-weighted averages prevent manipulation
- Distribution cap limits reward amounts
- Slippage protection on weight updates

## Internal Functions

| Function Name | Description | Parameters |
|---------------|-------------|------------|
| _updateReward | Updates reward state | `account`: User address |
| _updateWeights | Updates time-weighted averages | `newWeight`: New weight value |
| _getBaseWeight | Gets base weight for account | `account`: User address |
| _applyBoost | Applies boost multiplier | `account`: User address<br>`baseWeight`: Base weight |

## Dependencies

The contract depends on:

- OpenZeppelin's AccessControl for roles
- OpenZeppelin's ReentrancyGuard for security
- OpenZeppelin's Pausable for emergency control
- OpenZeppelin's SafeERC20 for token operations
- BoostCalculator library for boost calculations
- TimeWeightedAverage library for weight tracking
- IGaugeController for weight management