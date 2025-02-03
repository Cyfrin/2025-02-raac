# BoostCalculator

## Overview

The BoostCalculator is a library designed to calculate and manage boost multipliers for reward distribution.
It implements Curve-style boost calculations with time-weighted averages for dynamic boost based on veToken holdings.

## Purpose

- Calculate and manage boost multipliers for reward distribution
- Track time-weighted averages for boost calculations 
- Manage user-specific and global boost periods
- Provide configurable boost parameters via structs
- Handle balance updates with historical tracking

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| calculateBoost | Calculates boost based on veToken ratio | Internal Pure | `veBalance`: User's veToken balance<br>`totalVeSupply`: Total veToken supply<br>`params`: Boost parameters | uint256: Boost value in basis points |
| updateUserBalance | Updates user's balance for boost calculation | Internal | `state`: Boost state<br>`user`: User address<br>`newBalance`: New balance to record | None |
| updateBoostPeriod | Updates the global boost period | Internal | `state`: Boost state to update | None |
| calculateTimeWeightedBoost | Calculates time-weighted boost for amount | Internal View | `state`: Boost state<br>`userBalance`: User's veToken balance<br>`totalSupply`: Total veToken supply<br>`amount`: Amount to boost | (uint256, uint256): Boost points and boosted amount |

## Implementation Details

### Features:

- Data management using BoostParameters and BoostState structs
- Time-weighted average tracking for user and global states
- Configurable boost parameters (min/max bounds, window periods)
- Dynamic boost calculations based on voting power ratios

## Data Structures

### BoostParameters
| Field | Type | Description |
|-------|------|-------------|
| maxBoost | uint256 | Maximum allowed boost in basis points |
| minBoost | uint256 | Minimum allowed boost in basis points |
| boostWindow | uint256 | Time window for boost calculations |
| totalWeight | uint256 | Total weight in the system |
| totalVotingPower | uint256 | Total voting power in system |
| votingPower | uint256 | Current voting power |

### BoostState
| Field | Type | Description |
|-------|------|-------------|
| userPeriods | mapping(address => TimeWeightedAverage.Period) | User-specific time periods |
| boostPeriod | TimeWeightedAverage.Period | Global boost period |
| maxBoost | uint256 | Maximum allowed boost in basis points |
| minBoost | uint256 | Minimum allowed boost in basis points |
| boostWindow | uint256 | Time window for calculations |
| baseWeight | uint256 | Base weight for calculations |
| votingPower | uint256 | Current voting power |
| totalWeight | uint256 | Total weight in system |
| totalVotingPower | uint256 | Total voting power in system |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| BoostUpdated | Emitted when boost multiplier changes | `user`: Address of user<br>`oldBoost`: Previous boost value<br>`newBoost`: New boost value |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidBoostParameters | When boost calculation parameters invalid |
| InvalidBoostWindow | When boost window is zero |
| InvalidBoostBounds | When boost bounds incorrectly configured |

## Usage Notes

- Library should be used with veToken system
- Boost calculations based on veToken balance ratio
- Time-weighted averages prevent manipulation
- All calculations use 18 decimal precision
- Default boost of minBoost applied when no voting power
- Boost values capped between minBoost and maxBoost
- Boost multipliers in basis points (10000 = 1x)

## Dependencies

The library depends on:

- TimeWeightedAverage library for period calculations
- Solidity version 0.8.19 or higher for overflow checks