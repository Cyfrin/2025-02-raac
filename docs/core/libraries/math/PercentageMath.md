# PercentageMath

## Overview

The PercentageMath library provides optimized functions for percentage calculations with fixed-point arithmetic. It uses a standard precision of 2 decimals (100.00%) and implements assembly-optimized operations for gas efficiency.

## Purpose

- Provide gas-efficient percentage calculations
- Ensure safe arithmetic operations with overflow protection
- Standardize percentage precision across the protocol
- Enable accurate rounding in percentage operations

## Key Constants

| Name | Value | Description |
|------|-------|-------------|
| PERCENTAGE_FACTOR | 1e4 | Represents 100.00% (maximum percentage) |
| HALF_PERCENTAGE_FACTOR | 0.5e4 | Represents 50.00% (used for rounding) |

## Key Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| percentMul | Multiplies a value by a percentage | `value`: Base value<br>`percentage`: Percentage to multiply | Result of (value × percentage) ÷ 100% |
| percentDiv | Divides a value by a percentage | `value`: Base value<br>`percentage`: Percentage to divide by | Result of (value × 100%) ÷ percentage |

### Function Details

1. **percentMul**
   - Assembly optimized for gas savings
   - Includes overflow protection
   - Rounds up if remainder ≥ 0.5
   - Formula: `(value * percentage + HALF_PERCENTAGE_FACTOR) / PERCENTAGE_FACTOR`

2. **percentDiv**
   - Assembly optimized for gas savings
   - Includes overflow and division by zero protection
   - Rounds up if remainder ≥ 0.5
   - Formula: `(value * PERCENTAGE_FACTOR + percentage/2) / percentage`

## Implementation Details

The library implements:

- Pure Solidity functions using assembly
- Fixed-point arithmetic with 4 decimal places
- Optimized gas usage through assembly
- Safe math operations with overflow checks
- Derived from Aave V3 core contracts

## Usage Guidelines

1. **Import and Usage**
   ```solidity
   using PercentageMath for uint256;
   ```

2. **Multiplication Example**
   ```solidity
   uint256 value = 1000;
   uint256 percentage = 5000; // 50.00%
   uint256 result = value.percentMul(percentage); // 500
   ```

3. **Division Example**
   ```solidity
   uint256 value = 1000;
   uint256 percentage = 5000; // 50.00%
   uint256 result = value.percentDiv(percentage); // 2000
   ```

## Integration Points

The library is used by:

- LendingPool contract
- RAACToken contract
- ReserveLibrary
- Other protocol components requiring percentage calculations

## Error Conditions

- Reverts on overflow in percentMul:
  - When `value > (type(uint256).max - HALF_PERCENTAGE_FACTOR) / percentage`
- Reverts on overflow or invalid input in percentDiv:
  - When `percentage == 0`
  - When `value > (type(uint256).max - halfPercentage) / PERCENTAGE_FACTOR`

### Test Setup Requirements

1. Library Testing:
   - Test with various percentage values
   - Test edge cases (0%, 100%)
   - Test rounding behavior
   - Test overflow conditions

2. Integration Testing:
   - Test with actual token amounts
   - Verify precision in real scenarios
   - Test with maximum supported values

## Notes

- All percentages use 2 decimal places (e.g., 50.00% = 5000)
- Assembly optimization reduces gas costs
- Rounding is always up for .5 or greater
- Based on Aave V3 core implementation
- Last updated: 2023-01-27 