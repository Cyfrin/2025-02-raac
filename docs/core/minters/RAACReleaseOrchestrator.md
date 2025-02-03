# RAACReleaseOrchestrator

## Overview

The RAACReleaseOrchestrator manages the vesting and release of RAAC tokens for various stakeholders, implementing controlled distribution of 65% of the total token supply. It provides customizable vesting schedules with different parameters for team members, advisors, treasury, and various sale participants.

## Purpose

- Manage token vesting schedules for different stakeholder categories
- Implement linear daily token release mechanisms
- Control initial token distribution across different categories
- Provide emergency controls for vesting management
- Track and enforce category-specific allocation limits

## Access Control

The contract implements role-based access control with distinct roles:

| Role | Description |
|------|-------------|
| DEFAULT_ADMIN_ROLE | Can update category allocations and manage other roles |
| ORCHESTRATOR_ROLE | Can create vesting schedules for beneficiaries |
| EMERGENCY_ROLE | Can pause the contract and revoke vesting schedules |

## Key Functions/Structures

### VestingSchedule Structure
| Name | Type | Description |
|------|------|-------------|
| totalAmount | uint256 | Total amount of tokens to be vested |
| startTime | uint256 | Start time of the vesting schedule |
| duration | uint256 | Duration of the vesting period |
| releasedAmount | uint256 | Amount of tokens already released |
| lastClaimTime | uint256 | Timestamp of the last token claim |
| initialized | bool | Whether the schedule has been initialized |

### Core Functions
| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| createVestingSchedule | Creates a new vesting schedule | ORCHESTRATOR_ROLE | `beneficiary`: address, `category`: bytes32, `amount`: uint256, `startTime`: uint256 |
| release | Releases vested tokens to caller | Any | None |
| emergencyRevoke | Revokes a vesting schedule | EMERGENCY_ROLE | `beneficiary`: address |
| updateCategoryAllocation | Updates category allocation | DEFAULT_ADMIN_ROLE | `category`: bytes32, `newAllocation`: uint256 |

## Implementation Details

The component implements:

- Linear vesting with 90-day cliff period
- 700-day vesting duration
- Daily release intervals
- Category-based allocation tracking
- Emergency shutdown mechanism
- Reentrancy protection

Category Allocations:
- Team: 18% (18,000,000 RAAC)
- Advisors: 10.3% (10,300,000 RAAC)
- Treasury: 5% (5,000,000 RAAC)
- Private Sale: 10% (10,000,000 RAAC)
- Public Sale: 15% (15,000,000 RAAC)
- Liquidity: 6.8% (6,800,000 RAAC)

Dependencies:
- OpenZeppelin: AccessControl, ReentrancyGuard, Pausable, SafeERC20
- Custom interfaces: IRAACToken, IReleaseOrchestrator

## Events

| Name | Description |
|------|-------------|
| VestingScheduleCreated | Emitted when a new vesting schedule is created |
| TokensReleased | Emitted when tokens are released to a beneficiary |
| EmergencyWithdraw | Emitted during emergency withdrawal of tokens |
| VestingScheduleRevoked | Emitted when a vesting schedule is revoked |
| CategoryAllocationUpdated | Emitted when category allocation is updated |
| EmergencyShutdown | Emitted when emergency shutdown state changes |

## Error Conditions

| Name | Description |
|------|-------------|
| InvalidAddress | Zero address provided |
| InvalidAmount | Invalid amount specified |
| VestingAlreadyInitialized | Vesting schedule already exists |
| InvalidCategory | Invalid category specified |
| CategoryAllocationExceeded | Category allocation limit exceeded |
| NoVestingSchedule | No vesting schedule found |
| NothingToRelease | No tokens available for release |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy RAAC token contract
   - Deploy RAACReleaseOrchestrator with token address
   - Set up roles (Admin, Orchestrator, Emergency)

2. Test Categories:
   - Vesting schedule creation and management
   - Token release mechanics
   - Category allocation controls
   - Emergency operations
   - Access control verification
   - Time-based vesting calculations

## Notes

- Implements 65% of total RAAC token distribution
- Vesting cliff period of 90 days
- Minimum release interval of 1 day
- Grace period of 7 days
- Category allocations are immutable after initialization
- Emergency revocation requires careful consideration
- All amounts use 18 decimal precision
- Linear daily vesting after cliff period 