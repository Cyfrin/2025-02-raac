# RAACGauge

## Overview

The RAACGauge is a contract that manages weekly RAAC emissions and staking with direction voting capabilities.   
It extends BaseGauge and implements time-weighted voting and reward distribution mechanisms.

## Purpose

- Manage RAAC token staking
- Handle emission direction voting
- Control weekly reward distribution
- Track time-weighted voting averages
- Provide boost calculations for rewards
- Manage weekly periods and emissions

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| voteEmissionDirection | Cast vote for emission direction | External | `direction`: Vote direction (0-10000) | None |
| updatePeriod | Update weekly period | Controller | None | None |
| notifyRewardAmount | Notify new rewards | Controller | `amount`: Reward amount | None |
| stake | Stake RAAC tokens | External | `amount`: Stake amount | None |
| withdraw | Withdraw staked tokens | External | `amount`: Withdraw amount | None |
| setWeeklyEmission | Set weekly emission rate | Controller | `emission`: New emission rate | None |

## Implementation Details

### Features:

- Weekly period management
- Time-weighted direction voting
- Staking mechanism
- Boost system
- Emergency controls
- Reward distribution
- Emission caps

## Data Structures

### EmissionVote
| Field | Type | Description |
|-------|------|-------------|
| direction | uint256 | Vote direction (0-10000) |
| weight | uint256 | Voting power weight |
| timestamp | uint256 | Vote timestamp |

### WeeklyState
| Field | Type | Description |
|-------|------|-------------|
| votingPeriod | TimeWeightedAverage.Period | Current voting period |
| weeklyEmission | uint256 | Weekly emission rate |
| distributedThisWeek | uint256 | Amount distributed this week |
| weekStartTime | uint256 | Week start timestamp |

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| WEEK | 7 days | Period duration |
| MAX_WEEKLY_EMISSION | 500000e18 | Maximum weekly emission |
| VOTE_PRECISION | 10000 | Vote precision (100%) |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| EmissionDirectionVoted | When direction vote cast | `user`: Address<br>`direction`: Vote<br>`votingPower`: Power |
| PeriodUpdated | When period rolls over | `timestamp`: Time<br>`avgWeight`: Average |
| RewardNotified | When rewards added | `amount`: Amount |
| WeeklyEmissionUpdated | When emission changes | `emission`: New rate |
| Staked | When tokens staked | `user`: Address<br>`amount`: Amount |
| Withdrawn | When tokens withdrawn | `user`: Address<br>`amount`: Amount |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidWeight | When vote weight invalid |
| NoVotingPower | When user has no veRAAC |
| RewardCapExceeded | When exceeds emission cap |
| PeriodNotElapsed | When period active |
| ZeroRewardRate | When rate calculation fails |
| InvalidAmount | When amount is zero |

## Access Control

The contract inherits BaseGauge roles:
- CONTROLLER_ROLE
- EMERGENCY_ADMIN
- FEE_ADMIN

## Usage Notes

- Requires veRAAC for voting power
- Weekly periods for emissions
- Time-weighted vote tracking
- Staking affects reward distribution
- Emergency pause available
- Emission caps enforced
- Boost parameters configurable

## Dependencies

The contract depends on:

- OpenZeppelin's IERC20 and SafeERC20
- OpenZeppelin's ReentrancyGuard
- TimeWeightedAverage library
- BoostCalculator library
- BaseGauge contract
- IGaugeController interface


## TODO: 

Minter automatically adjust