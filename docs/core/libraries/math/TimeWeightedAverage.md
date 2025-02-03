# TimeWeightedAverage

## Overview

The TimeWeightedAverage is a library designed to calculate time-weighted averages with support for weighted periods.
It provides functionality for tracking and calculating time-weighted averages of values over specified time periods.

## Purpose

- Calculate time-weighted averages for values over time periods
- Support weighted period calculations and tracking
- Support for sequential or overlapping periods
- Support period management and updates

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| createPeriod | Creates a new time-weighted period | Internal | `self`: Period struct reference<br>`startTime`: Period start time<br>`duration`: Period duration<br>`initialValue`: Starting value<br>`weight`: Period weight | None |
| updateValue | Updates current value and weighted sums | Internal | `self`: Period struct reference<br>`newValue`: New value to set<br>`timestamp`: Update timestamp | None |
| calculateAverage | Calculates average up to timestamp | Internal View | `self`: Period struct reference<br>`timestamp`: Calculation end time | uint256: Time-weighted average |
| getCurrentValue | Gets current raw value | Internal View | `self`: Period struct reference | uint256: Current value |
| calculateTimeWeightedAverage | Calculates average across periods | Public Pure | `periods`: Period parameters array<br>`timestamp`: Calculation end time | uint256: Weighted average |

## Implementation Details

### Features:

- Data management using Period and PeriodParams structs
- Event emission for state changes 
- Time boundary and weight validations
- Overflow protection for calculations
- Support for single and multiple periods
- Gas optimizations using unchecked blocks
- Early returns for efficiency

## Data Structures

### Period
| Field | Type | Description |
|-------|------|-------------|
| startTime | uint256 | Beginning timestamp of period |
| endTime | uint256 | End timestamp of period |
| lastUpdateTime | uint256 | Last update timestamp |
| value | uint256 | Current tracked value |
| weightedSum | uint256 | Running sum of weighted values |
| totalDuration | uint256 | Total duration of values |
| weight | uint256 | Period weight (scaled by 1e18) |

### PeriodParams
| Field | Type | Description |
|-------|------|-------------|
| startTime | uint256 | Start timestamp of period |
| endTime | uint256 | End timestamp of period |
| value | uint256 | Value for period |
| weight | uint256 | Weight of period (scaled by 1e18) |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| PeriodCreated | Emitted when period created | `startTime`: Period start time<br>`duration`: Period duration<br>`initialValue`: Initial value |
| ValueUpdated | Emitted when value updated | `timestamp`: Update time<br>`oldValue`: Previous value<br>`newValue`: New value |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidTime | When timestamp outside valid range |
| InvalidWeight | When weight parameter invalid |
| ZeroDuration | When period duration is zero |
| InvalidStartTime | When start time invalid |
| ValueOverflow | When calculation overflows |
| ZeroWeight | When weight is zero |
| PeriodNotElapsed | When period has not elapsed |

## Usage Notes

- All weights use 18 decimal precision (1e18 scale)
- Periods require valid start times after current block
- Duration, weights must be non-zero
- Updates must occur within period boundaries
- Multiple periods calculation possible & partial periods
- This lib do not handle any token transfers 