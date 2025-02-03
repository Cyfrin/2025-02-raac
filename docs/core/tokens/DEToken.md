
# DEToken (Debitum Emptor Token)

## Overview

The DEToken (Debitum Emptor Token) is an implementation of the token used in the RAAC Stability Pool. It represents a user's share in the Stability Pool and is redeemable 1:1 with RToken.

## Purpose

- Represent user deposits in the RAAC Stability Pool
- Handle minting and burning of DETokens
- Manage the relationship between DETokens and RTokens
- Restrict transfers to only be initiated by the Stability Pool

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setStabilityPool | Sets the Stability Pool address | Owner Only | `newStabilityPool`: Address of the new Stability Pool |
| mint | Mints DETokens to a user | Stability Pool Only | `to`: Address to mint tokens to<br>`amount`: Amount of tokens to mint |
| burn | Burns DETokens from a user | Stability Pool Only | `from`: Address to burn tokens from<br>`amount`: Amount of tokens to burn |
| transferAsset | Transfers the underlying RToken to a user | Stability Pool Only | `user`: Address to transfer RTokens to<br>`amount`: Amount of RTokens to transfer |
| transfer | Transfers DETokens between addresses | Stability Pool Only | `recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| transferFrom | Transfers DETokens between addresses | Stability Pool Only | `sender`: Address to transfer from<br>`recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| getStabilityPool | Returns the Stability Pool address | Public View | None |
| getRTokenAddress | Returns the RToken address | Public View | None |

## Implementation Details

The DEToken is implemented in the DEToken.sol contract.

Key features of the implementation include:

- Inherits from ERC20 and ERC20Permit for standard token functionality
- Uses SafeERC20 for secure token transfers
- Restricts minting, burning, and transfers to only be initiated by the Stability Pool
- Maintains a 1:1 relationship with RTokens

## Interactions

The DEToken contract interacts with:

- Stability Pool: for minting, burning, and transferring tokens
- RToken: as the underlying asset that DETokens represent
