

# RAACVoting

## Overview

The RAACVoting library implements core functions for vote-locking mechanics and power calculations in the RAAC governance system. It provides Curve-style voting power calculations with time decay, ensuring compatible and proven voting mechanics.

## Purpose

- Calculate time-weighted voting power
- Implement Curve-compatible bias and slope formulas
- Manage lock duration validation
- Provide core voting math primitives
- Support time-decay voting mechanics

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| calculateBias | Calculates voting power bias | Public Pure | `amount`: Token amount<br>`unlockTime`: Lock end time<br>`currentTime`: Current time | int128: Calculated bias |
| calculateSlope | Calculates power decay slope | Public Pure | `amount`: Token amount | int128: Calculated slope |
| safe128 | Safely converts uint256 to int128 | Internal Pure | `n`: Number to convert | int128: Safe conversion |

## Implementation Details

### Features:

- Curve-compatible voting calculations
- Time-weighted power decay
- Lock duration tracking

## Data Structures

### Point
| Field | Type | Description |
|-------|------|-------------|
| bias | int128 | Current voting power |
| slope | int128 | Rate of voting power decay |
| timestamp | uint256 | Point creation timestamp |

## Constants

| Constant Name | Value | Description |
|---------------|-------|-------------|
| MAX_LOCK_TIME | 126144000 | Maximum lock duration (4 years) |
| MULTIPLIER | 10**18 | Scaling factor for calculations |
| MAX_INT128 | 2^127 - 1 | Maximum value for int128 |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| ZeroAmount | Amount parameter is zero |
| InvalidUnlockTime | Unlock time is invalid |
| LockDurationTooLong | Lock duration exceeds maximum |
| BiasOverflow | Bias calculation overflows |
| SlopeOverflow | Slope calculation overflows |
| ValueTooLargeForInt128 | Value exceeds int128 bounds |

## Usage Notes

- All time values are in seconds
- Maximum lock duration is 4 years
- Bias decreases linearly over time
- Slope remains constant for a lock
- Uses int128 for Curve compatibility
- All calculations include overflow checks
- Power decay is deterministic

## Mathematical Formulas

### Bias Calculation
```
bias = slope * timeLeft
where:
- timeLeft = unlockTime - currentTime
- slope = amount / MAX_LOCK_TIME
```

### Slope Calculation
```
slope = amount / MAX_LOCK_TIME
```

## Dependencies

The library depends on:

- Solidity version 0.8.19 or higher
- Safe math operations (built-in)

## Security Considerations

- All numerical operations include overflow checks
- Time values are validated against bounds
- Lock durations are capped at maximum
- Safe conversions between number types at aim
- Curve-compatible implementation
- No external contract dependencies
- Immutable constants for core parameters

## Integration Notes

- Requires proper time management
- Must handle token decimals appropriately