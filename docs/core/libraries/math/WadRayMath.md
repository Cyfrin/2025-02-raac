# WadRayMath

## Overview

The WadRayMath library provides optimized functions for fixed-point arithmetic using Wad (18 decimals) and Ray (27 decimals) units. It includes assembly-optimized operations for multiplication, division, conversion, and exponential calculations.

## Purpose

- Provide gas-efficient fixed-point arithmetic operations
- Enable precise calculations with 18 (Wad) and 27 (Ray) decimal places
- Ensure safe arithmetic with overflow protection
- Support exponential and power calculations for financial computations

## Key Constants

| Name | Value | Description |
|------|-------|-------------|
| WAD | 1e18 | Base unit for Wad calculations (18 decimals) |
| HALF_WAD | 0.5e18 | Half Wad for rounding |
| RAY | 1e27 | Base unit for Ray calculations (27 decimals) |
| HALF_RAY | 0.5e27 | Half Ray for rounding |
| WAD_RAY_RATIO | 1e9 | Conversion ratio between Wad and Ray |
| SECONDS_PER_YEAR | 365 days | Standard year duration |

## Key Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| wadMul | Multiplies two Wad numbers | `a`: First Wad<br>`b`: Second Wad | `c`: Result in Wad |
| wadDiv | Divides two Wad numbers | `a`: Dividend Wad<br>`b`: Divisor Wad | `c`: Result in Wad |
| rayMul | Multiplies two Ray numbers | `a`: First Ray<br>`b`: Second Ray | `c`: Result in Ray |
| rayDiv | Divides two Ray numbers | `a`: Dividend Ray<br>`b`: Divisor Ray | `c`: Result in Ray |
| rayToWad | Converts Ray to Wad | `a`: Ray value | `b`: Wad result |
| wadToRay | Converts Wad to Ray | `a`: Wad value | `b`: Ray result |
| rayPow | Calculates power of Ray | `x`: Base Ray<br>`n`: Exponent | `z`: Result in Ray |
| rayExp | Calculates e^x for Ray | `x`: Ray value | `z`: Result in Ray |

### Function Details

1. **Multiplication Operations**
   - Assembly optimized for gas savings
   - Include overflow protection
   - Round up if remainder ≥ 0.5
   ```solidity
   // Example formulas:
   wadMul: (a * b + HALF_WAD) / WAD
   rayMul: (a * b + HALF_RAY) / RAY
   ```

2. **Division Operations**
   - Assembly optimized for gas savings
   - Include overflow and division by zero protection
   - Round up if remainder ≥ 0.5
   ```solidity
   // Example formulas:
   wadDiv: (a * WAD + b/2) / b
   rayDiv: (a * RAY + b/2) / b
   ```

3. **Conversion Operations**
   - `rayToWad`: Rounds down Ray to Wad
   - `wadToRay`: Converts Wad up to Ray with overflow check

4. **Mathematical Operations**
   - `rayPow`: Efficient binary exponentiation for Ray numbers
   - `rayExp`: Taylor series implementation of e^x for Ray numbers

## Implementation Details

The library implements:

- Assembly-optimized arithmetic operations
- Fixed-point math with 18 and 27 decimal precision
- Safe math operations with overflow checks
- Taylor series expansion for exponential function
- Based on Aave V3 core with RAAC modifications

## Usage Guidelines

1. **Basic Operations**
   ```solidity
   using WadRayMath for uint256;
   
   uint256 resultWad = a.wadMul(b);
   uint256 resultRay = x.rayDiv(y);
   ```

2. **Conversions**
   ```solidity
   uint256 wad = ray.rayToWad();
   uint256 ray = wad.wadToRay();
   ```

3. **Advanced Math**
   ```solidity
   uint256 power = base.rayPow(exponent);
   uint256 exponential = x.rayExp();
   ```

## Integration Points

The library is used by:

- [LendingPool](core/pools/LendingPool)
- [StabilityPool](core/pools/StabilityPool)
- [DebtToken](core/tokens/DebtToken)
- [DEToken](core/tokens/DEToken)
- [RToken](core/tokens/RToken)
- [RAACToken](core/tokens/RAACToken)
- [ReserveLibrary](core/libraries/pools/ReserveLibrary)

## Error Conditions

- Reverts on overflow in multiplication operations
- Reverts on division by zero
- Reverts on overflow in conversions
- Reverts when input values exceed safe bounds

### Test Setup Requirements

1. Basic Operations Testing:
   - Test with various Wad/Ray values
   - Verify rounding behavior
   - Check overflow conditions
   - Test conversion accuracy

2. Advanced Math Testing:
   - Test power function with various exponents
   - Verify exponential function accuracy
   - Test edge cases and bounds
   - Validate Taylor series precision

## Notes

- All operations round up for values ≥ 0.5
- Assembly optimization provides significant gas savings
- Exponential function uses 6-term Taylor series
- Modified from Aave V3 core (2023-01-27)
- RAAC modifications added rayPow and rayExp (2024-07-25) 