
# DebtToken

## Overview

The DebtToken is an implementation of the debt token for the RAAC lending protocol. It represents the debt that users accumulate over time due to interest accrual, using an index-based system similar to Aave's VariableDebtToken.

## Purpose

- Represent user debt in the RAAC lending protocol
- Handle minting and burning of debt tokens
- Manage debt balances that increase over time due to interest accrual
- Provide scaled and non-scaled balance information

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setReservePool | Sets the Reserve Pool address | Owner Only | `newReservePool`: Address of the new Reserve Pool |
| updateUsageIndex | Updates the usage index | Reserve Pool Only | `newUsageIndex`: The new usage index |
| mint | Mints debt tokens to a user | Reserve Pool Only | `user`: Address initiating the mint<br>`onBehalfOf`: Recipient of the debt tokens<br>`amount`: Amount to mint<br>`index`: Usage index at the time of minting |
| burn | Burns debt tokens from a user | Reserve Pool Only | `from`: Address from which tokens are burned<br>`amount`: Amount to burn<br>`index`: Usage index at the time of burning |
| balanceOf | Returns the scaled debt balance of the user | Public View | `account`: Address of the user |
| totalSupply | Returns the scaled total supply | Public View | None |
| getUsageIndex | Returns the usage index | Public View | None |
| getReservePool | Returns the Reserve Pool address | Public View | None |
| scaledBalanceOf | Returns the non-scaled balance of the user | Public View | `user`: Address of the user |
| scaledTotalSupply | Returns the non-scaled total supply | Public View | None |

## Implementation Details

The DebtToken is implemented in the DebtToken.sol contract.

Key features of the implementation include:

- Inherits from ERC20 and ERC20Permit for standard token functionality
- Uses WadRayMath library for precise calculations
- Implements an index-based system for interest accrual
- Manages user debt using a mapping of user addresses to UserState structures
- Overrides transfer functions to prevent direct transfers of debt tokens

## Interactions

The DebtToken contract interacts with:

- Reserve Pool (LendingPool): for minting, burning, and updating the usage index
- Users: for querying balances and total supply
