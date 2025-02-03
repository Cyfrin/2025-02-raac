# ReserveLibrary

## Overview

The ReserveLibrary is a core component of the RAAC lending protocol that manages reserve operations, including interest rate calculations, deposits, withdrawals, and state management.  
It implements a dynamic interest rate model with prime rate adjustments and utilization-based rate calculations.

## Purpose

- Manage reserve operations including deposits and withdrawals
- Calculate and update interest rates based on utilization
- Track and update liquidity and usage indices
- Handle prime rate adjustments with safety checks
- Provide normalized calculations for debt and income

## Key Functions/Structures

### ReserveData Structure
| Name | Type | Description |
|------|------|-------------|
| reserveRTokenAddress | address | Address of the reserve's RToken contract |
| reserveAssetAddress | address | Address of the underlying asset |
| reserveDebtTokenAddress | address | Address of the debt token contract |
| totalLiquidity | uint256 | Total liquidity in the reserve |
| totalUsage | uint256 | Total debt/usage in the reserve |
| liquidityIndex | uint128 | Current liquidity index in RAY |
| usageIndex | uint128 | Current usage/debt index in RAY |
| lastUpdateTimestamp | uint40 | Last time the reserve was updated |

### ReserveRateData Structure
| Name | Type | Description |
|------|------|-------------|
| currentLiquidityRate | uint256 | Current liquidity rate in RAY |
| currentUsageRate | uint256 | Current usage/borrow rate in RAY |
| primeRate | uint256 | Base prime rate in RAY |
| baseRate | uint256 | Minimum borrow rate in RAY |
| optimalRate | uint256 | Rate at optimal utilization in RAY |
| maxRate | uint256 | Maximum borrow rate in RAY |
| optimalUtilizationRate | uint256 | Target utilization rate in RAY |
| protocolFeeRate | uint256 | Protocol fee rate in RAY |

### Core Functions
| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| deposit | Handles deposit operation into reserve | Internal | `reserve`: ReserveData, `rateData`: ReserveRateData, `amount`: uint256, `depositor`: address |
| withdraw | Handles withdrawal from reserve | Internal | `reserve`: ReserveData, `rateData`: ReserveRateData, `amount`: uint256, `recipient`: address |
| updateReserveInterests | Updates reserve indices | Internal | `reserve`: ReserveData, `rateData`: ReserveRateData |
| setPrimeRate | Updates prime rate with safety checks | Internal | `reserve`: ReserveData, `rateData`: ReserveRateData, `newPrimeRate`: uint256 |

## Implementation Details

The library implements:

- Dynamic interest rate model using prime rate as reference
- Linear interest accrual for deposits
- Compound interest calculation for borrows
- Safety checks for rate parameters and operations
- Integration with RToken and DebtToken contracts
- Utilization-based rate calculations
- Protocol fee handling

Dependencies:
- OpenZeppelin: SafeERC20, IERC20
- WadRayMath: Fixed-point math with RAY precision
- PercentageMath: Percentage calculations
- Custom interfaces: IDebtToken, IRToken

## Events

| Name | Description |
|------|-------------|
| Deposit | Emitted on successful deposit with amount and minted tokens |
| Withdraw | Emitted on successful withdrawal with amount and burned tokens |
| ReserveInterestsUpdated | Emitted when indices are updated |
| InterestRatesUpdated | Emitted when rates are recalculated |
| PrimeRateUpdated | Emitted when prime rate changes |

## Error Conditions

| Name | Description |
|------|-------------|
| TimeDeltaIsZero | Time since last update is zero |
| LiquidityIndexIsZero | Liquidity index cannot be zero |
| InvalidAmount | Amount must be greater than zero |
| PrimeRateMustBePositive | Prime rate must be positive |
| PrimeRateChangeExceedsLimit | Prime rate change exceeds 5% limit |
| InsufficientLiquidity | Not enough liquidity for withdrawal |
| InvalidInterestRateParameters | Rate parameters violate constraints |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy mock contracts for testing
   - Set up initial rate parameters
   - Initialize reserve data

2. Test Categories:
   - Deposit and withdrawal functionality
   - Interest rate calculations
   - Prime rate adjustments
   - Security and overflow checks
   - Integration with tokens

## Notes

- All rates and indices use RAY (27 decimals) precision
- Prime rate changes are limited to 5% per update
- Interest calculations use different methods for deposits (linear) and borrows (compound), this generates dust.
- **Reentrancy protection must be implemented by the calling contract**
- Protocol fees are deducted from the gross yield
- The library assumes initialization of all data structures.