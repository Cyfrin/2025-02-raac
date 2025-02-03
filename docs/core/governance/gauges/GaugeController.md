# GaugeController

## Overview

The GaugeController is a contract that manages gauge weights and reward distribution for RWA and RAAC emissions.
It implements a voting-based weight system with time-weighted averages and boost calculations.

## Purpose

- Manage gauge weights through veRAAC voting
- Control reward distribution to gauges
- Track time-weighted averages for gauge weights
- Handle gauge type weights and periods
- Provide boost calculations for rewards
- Manage revenue distribution and performance fees

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| vote | Cast votes for gauge weight | External | `gauge`: Gauge address<br>`weight`: Vote weight | None |
| distributeRewards | Distribute rewards to gauge | External | `gauge`: Gauge address | None |
| updatePeriod | Update gauge period | External | `gauge`: Gauge address | None |
| setTypeWeight | Set weight for gauge type | Admin | `gaugeType`: Type<br>`weight`: New weight | None |
| addGauge | Add new gauge | Admin | `gauge`: Address<br>`gaugeType`: Type<br>`weight`: Initial weight | None |

## Implementation Details

### Features:

- Voting-based weight system
- Time-weighted average tracking
- Boost calculation system
- Revenue distribution
- Emergency controls
- Period management
- Type weight control

## Data Structures

### Gauge
| Field | Type | Description |
|-------|------|-------------|
| weight | uint256 | Current gauge weight |
| typeWeight | uint256 | Weight of gauge type |
| lastUpdateTime | uint256 | Last update timestamp |
| gaugeType | GaugeType | Type of gauge (RWA/RAAC) |
| isActive | bool | Active status |
| lastRewardTime | uint256 | Last reward timestamp |

### Period
| Field | Type | Description |
|-------|------|-------------|
| startTime | uint256 | Period start time |
| endTime | uint256 | Period end time |
| emission | uint256 | Period emission rate |
| distributed | uint256 | Total distributed amount |

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_BOOST | 25000 | Maximum boost (2.5x) |
| MIN_BOOST | 10000 | Minimum boost (1x) |
| WEIGHT_PRECISION | 10000 | Weight precision |
| MAX_TYPE_WEIGHT | 10000 | Maximum type weight |
| VOTE_DELAY | 10 days | Minimum vote delay |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| GaugeAdded | When new gauge added | `gauge`: Address<br>`gaugeType`: Type |
| WeightUpdated | When weight changes | `gauge`: Address<br>`oldWeight`: Previous<br>`newWeight`: New |
| TypeWeightUpdated | When type weight changes | `gaugeType`: Type<br>`oldWeight`: Previous<br>`newWeight`: New |
| PeriodRolled | When period updates | `gauge`: Address<br>`timestamp`: Time<br>`newEmission`: Rate |
| RewardDistributed | When rewards sent | `gauge`: Address<br>`user`: Distributor<br>`amount`: Amount |
| EmergencyShutdown | When emergency triggered | `gauge`: Address<br>`triggeredBy`: Admin |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| EmergencyPaused | When system is paused |
| UnauthorizedCaller | When caller lacks permission |
| GaugeNotFound | When gauge doesn't exist |
| GaugeAlreadyExists | When adding existing gauge |
| InvalidWeight | When weight is invalid |
| NoVotingPower | When user has no voting power |
| GaugeNotActive | When gauge is inactive |
| PeriodNotElapsed | When period hasn't ended |
| RewardCapExceeded | When reward exceeds cap |
| InvalidTimeRange | When time range invalid |

## Access Control Roles

| Role | Description |
|------|-------------|
| GAUGE_ADMIN | Can manage gauges and weights |
| EMERGENCY_ADMIN | Can trigger emergency controls |
| FEE_ADMIN | Can manage fee parameters |

## Usage Notes

- Votes require veRAAC token balance
- Weights updated through time-weighted average
- Type weights control relative emissions
- Boost calculations affect reward distribution
- Periods track emission distribution
- Emergency controls can pause operations
- Minimum vote delay for manipulation prevention

## Dependencies

The contract depends on:

- OpenZeppelin's AccessControl for roles
- OpenZeppelin's ReentrancyGuard for security
- OpenZeppelin's SafeERC20 for token operations
- TimeWeightedAverage library for weight tracking
- BoostCalculator library for boost calculations
- veRAACToken for voting power