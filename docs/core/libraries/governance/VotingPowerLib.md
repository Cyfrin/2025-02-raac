# VotingPowerLib

## Overview

The VotingPowerLib library provides functionality for managing voting power calculations and checkpoints in the RAAC governance system. It implements time-weighted voting power, historical tracking, and linear power decay mechanisms based on lock duration.

## Purpose

- Calculate and track time-weighted voting power
- Manage historical voting power checkpoints
- Handle slope-based power decay over time
- Calculate boost multipliers for governance
- Support power queries at specific timestamps
- Maintain user voting points and slope changes
- Aim to gas-efficient power calculations

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| calculateAndUpdatePower | Calculates and updates user voting power | Internal | `state`: Voting power state<br>`user`: User address<br>`amount`: Token amount<br>`unlockTime`: Lock end time | (int128, int128): bias and slope |
| getCurrentPower | Gets current voting power for account | Internal View | `state`: Voting power state<br>`account`: User address<br>`timestamp`: Query timestamp | uint256: Current power |
| writeCheckpoint | Creates new power checkpoint | Internal | `state`: Voting power state<br>`account`: User address<br>`newPower`: New power value | None |
| calculateBoost | Calculates boost multiplier | Internal Pure | `userBalance`: User's balance<br>`totalSupply`: Total supply<br>`amount`: Amount to boost<br>`maxBoost`: Maximum boost | uint256: Boost value |
| calculatePowerAtTimestamp | Gets power at specific timestamp | Internal View | `state`: Voting power state<br>`account`: User address<br>`timestamp`: Target timestamp | uint256: Historical power |

## Implementation Details

### Features:

- Time-weighted voting power calculation
- Linear power decay based on lock duration
- Compressed checkpoint storage
- Slope-based power updates
- Historical power tracking
- Boost multiplier calculations

## Data Structures

### VotingPowerState
| Field | Type | Description |
|-------|------|-------------|
| points | mapping(address => RAACVoting.Point) | User voting points |
| checkpoints | mapping(address => Checkpoint[]) | Historical checkpoints |
| slopeChanges | mapping(uint256 => int128) | Slope changes at timestamps |

### Point
| Field | Type | Description |
|-------|------|-------------|
| bias | int128 | Initial voting power |
| slope | int128 | Power decay rate |
| timestamp | uint256 | Point creation time |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| VotingPowerUpdated | Emitted on power changes | `user`: User address<br>`oldPower`: Previous power<br>`newPower`: New power |
| CheckpointWritten | Emitted on checkpoint creation | `account`: User address<br>`blockNumber`: Block number<br>`power`: Power value |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| NoCheckpointsFound | No checkpoints exist for account |
| InvalidPowerParameters | Invalid power calculation parameters |
| InvalidBoostParameters | Invalid boost calculation parameters |

## Usage Notes

- Power decays linearly to zero at unlock time
- Checkpoints are compressed for gas efficiency
- Maximum lock duration is 4 years (1460 days)
- Boost calculations depend on veToken balance ratio
- Historical power queries use checkpoint system
- Slope changes track power decay schedule
- Events should be monitored for power updates

## Dependencies

The library depends on:

- RAACVoting library for point calculations
- TimeWeightedAverage library for period tracking
- Checkpoints library for historical data
- Solidity version 0.8.19 or higher

## Security Considerations

- Power values use safe math operations
- Timestamps are validated against block time
- Slope changes must be properly tracked
- Power decay cannot be manipulated
- Checkpoints are immutable once written
- Boost calculations have upper bounds
- Only authorized contracts should update power