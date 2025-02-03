# RWA Gauge

## Overview

The RWAGauge contract implements a monthly gauge mechanism for Real World Asset (RWA) yield direction with time-weighted voting.  
It extends [BaseGauge](core/governance/gauges/BaseGauge.md) to provide specialized functionality for managing RWA-specific voting periods, reward distribution, and boost calculations.

## Purpose

- Manage monthly voting periods for RWA yield direction
- Implement time-weighted average calculations for vote power
- Distribute rewards with boost multipliers based on veToken holdings
- Control monthly emission rates and caps for reward distribution

## Access Control

The contract implements access control with distinct roles:

| Role | Description |
|------|-------------|
| CONTROLLER_ROLE | Can update periods, notify rewards, and manage gauge parameters |
| EMERGENCY_ADMIN | Can pause/unpause the contract in emergencies |
| FEE_ADMIN | Can set distribution caps and fee parameters |

## Key Functions

| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| `voteYieldDirection` | Vote on yield direction with voting power | Any user | `direction`: Yield direction in basis points |
| `updatePeriod` | Updates monthly period and calculates new weights | Controller | None |
| `notifyRewardAmount` | Notifies gauge of new reward amount | Controller | `amount`: Reward tokens to distribute |
| `getReward` | Claims accumulated rewards | Any user | None |
| `setMonthlyEmission` | Sets monthly emission cap | Controller | `emission`: New emission amount |
| `setBoostParameters` | Updates boost calculation parameters | Controller | `_maxBoost`, `_minBoost`, `_boostWindow` |

### Details

1. **Monthly State Management**
   - Tracks voting periods aligned to monthly boundaries
   - Maintains time-weighted average calculations
   - Records monthly emissions and distributions

2. **Yield Direction Voting**
   - Uses basis points precision (10000 = 100%)
   - Voting power based on veToken holdings
   - Time-weighted average calculations

3. **Reward Distribution**
   - Monthly emission caps
   - Boost multipliers based on veToken balance
   - Minimum claim intervals

## Implementation Details

The component implements/includes:

- Time-weighted average calculations using [TimeWeightedAverage](core/libraries/math/TimeWeightedAverage) library
- Boost calculations using [BoostCalculator](core/libraries/governance/BoostCalculator) library
- SafeERC20 for token transfers
- Monthly period management (30 days)
- Emergency pause functionality
- Access control inheritance from OpenZeppelin

## Usage Guidelines

1. **Voting on Yield Direction**
   ```solidity
   // Vote with 50% direction
   gauge.voteYieldDirection(5000);
   ```

2. **Claiming Rewards**
   ```solidity
   // Must wait MIN_CLAIM_INTERVAL between claims
   gauge.getReward();
   ```

## Integration Points

The component is used by:

| Name | Description |
|------|-------------|
| GaugeController | Manages gauge weights and voting power |
| veRAACToken | Provides voting power for boost calculations |
| Treasury | Receives and manages distributed rewards |

## Events

| Name | Description |
|------|-------------|
| YieldDirectionVoted | Emitted when user votes on yield direction |
| PeriodUpdated | Emitted when monthly period is updated |
| RewardNotified | Emitted when new rewards are added |
| MonthlyEmissionUpdated | Emitted when monthly emission cap is changed |

## Error Conditions

| Name | Description |
|------|-------------|
| InvalidWeight | Weight exceeds allowed precision (10000) |
| NoVotingPower | User has no veToken balance |
| RewardCapExceeded | Reward amount exceeds monthly cap |
| InsufficientRewardBalance | Contract has insufficient rewards |
| PeriodNotElapsed | Current period hasn't ended |
| ZeroRewardRate | Calculated reward rate is zero |

### Test Setup Requirements

1. Token Setup:
   - Deploy mock veRAACToken for voting power
   - Deploy mock rewardToken for distributions
   - Mint initial token supplies

2. Contract Setup:
   - Deploy GaugeController
   - Deploy RWAGauge with controller and reward token
   - Set initial weights and boost parameters
   - Grant necessary roles

3. Time Management:
   - Align to monthly period boundaries
   - Use time helpers for period transitions

## Notes

- Monthly periods are fixed at 30 days
- Maximum monthly emission is capped at 2.5M tokens
- Boost multipliers range from 1x to 2.5x
- Minimum claim interval is 1 day
- Emergency pause available for security
- Experimental implementation