
# RToken

## Overview

The RToken is an implementation of the interest-bearing token for the RAAC lending protocol. It represents a user's deposit in the Reserve Pool and accrues interest over time using an index-based system similar to Aave's AToken.

## Purpose

- Represent user deposits in the RAAC lending protocol
- Handle minting and burning of RTokens
- Manage deposit balances that increase over time due to interest accrual
- Provide scaled and non-scaled balance information

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setReservePool | Sets the Reserve Pool address | Owner Only | `newReservePool`: Address of the new Reserve Pool |
| updateLiquidityIndex | Updates the liquidity index | Reserve Pool Only | `newLiquidityIndex`: The new liquidity index |
| mint | Mints RTokens to a user | Reserve Pool Only | `caller`: Address initiating the mint<br>`onBehalfOf`: Recipient of the tokens<br>`amount`: Amount to mint<br>`index`: Liquidity index at the time of minting |
| burn | Burns RTokens from a user | Reserve Pool Only | `from`: Address from which tokens are burned<br>`receiverOfUnderlying`: Address receiving the underlying asset<br>`amount`: Amount to burn<br>`index`: Liquidity index at the time of burning |
| balanceOf | Returns the scaled balance of the user | Public View | `account`: Address of the user |
| totalSupply | Returns the scaled total supply | Public View | None |
| transfer | Transfers RTokens between addresses | Public | `recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| transferFrom | Transfers RTokens between addresses | Public | `sender`: Address to transfer from<br>`recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| getLiquidityIndex | Returns the liquidity index | Public View | None |
| getReservePool | Returns the Reserve Pool address | Public View | None |
| scaledBalanceOf | Returns the non-scaled balance of the user | Public View | `user`: Address of the user |
| scaledTotalSupply | Returns the non-scaled total supply | Public View | None |
| setBurner | Sets the burner address | Owner Only | `burner`: Address of the burner |
| setMinter | Sets the minter address | Owner Only | `minter`: Address of the minter |
| getAssetAddress | Returns the underlying asset address | Public View | None |
| transferAsset | Transfers the underlying asset to a user | Reserve Pool Only | `user`: Address to transfer to<br>`amount`: Amount to transfer |
| rescueToken | Rescues tokens mistakenly sent to the contract | Reserve Pool Only | `tokenAddress`: Address of the token to rescue<br>`recipient`: Address to send rescued tokens to<br>`amount`: Amount of tokens to rescue |
| transferAccruedDust | Transfers accrued token dust | Reserve Pool Only | `recipient`: Address to send accrued dust to<br>`amount`: Amount of dust to transfer |

## Implementation Details

The RToken is implemented in the RToken.sol contract.

Key features of the implementation include:

- Inherits from ERC20 and ERC20Permit for standard token functionality
- Uses WadRayMath library for precise calculations
- Implements an index-based system for interest accrual
- Manages user deposits using a mapping of user addresses to UserState structures
- Overrides transfer functions to use scaled amounts

## Interactions

The RToken contract interacts with:

- Reserve Pool (LendingPool): for minting, burning, and updating the liquidity index
- Users: for transfers, deposits, and withdrawals
- Underlying asset (e.g., crvUSD): for transferring the actual asset during mints and burns
