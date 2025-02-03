# LendingPool

## Overview

The LendingPool is the main contract for the RAAC lending protocol, managing lending and borrowing operations using RAAC NFTs as collateral. It implements an index-based system for interest accrual and a dynamic interest rate model.

![alt text](<./lendingPoolDiagram.png>)

## Purpose

- Facilitate lending and borrowing operations using RAAC NFTs as collateral
- Manage loan data and interest calculations
- Implement a dynamic interest rate model based on pool utilization around a prime rate
- Handle liquidations and provide a grace period for users to repay
- Ensure secure and efficient token transfers

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| deposit | Allows a user to deposit reserve assets and receive RTokens | Public | `amount`: The amount of reserve assets to deposit |
| withdraw | Allows a user to withdraw reserve assets by burning RTokens | Public | `amount`: The amount of reserve assets to withdraw |
| depositNFT | Allows a user to deposit an NFT as collateral | Public | `tokenId`: The token ID of the NFT to deposit |
| withdrawNFT | Allows a user to withdraw an NFT | Public | `tokenId`: The token ID of the NFT to withdraw |
| borrow | Allows a user to borrow reserve assets using their NFT collateral | Public | `amount`: The amount of reserve assets to borrow |
| repay | Allows a user to repay their borrowed reserve assets | Public | `amount`: The amount to repay |
| updateState | Updates the state of the lending pool | Public | None |
| initiateLiquidation | Allows anyone to initiate the liquidation process for a user | Public | `userAddress`: The address of the user to liquidate |
| closeLiquidation | Allows a user to repay their debt and close the liquidation within the grace period | Public | None |
| finalizeLiquidation | Allows the Stability Pool to finalize the liquidation after the grace period | Stability Pool Only | `userAddress`: The address of the user being liquidated |
| calculateHealthFactor | Calculates the user's health factor | Public View | `userAddress`: The address of the user |
| getUserCollateralValue | Gets the total collateral value of a user | Public View | `userAddress`: The address of the user |
| getUserDebt | Gets the user's debt including interest | Public View | `userAddress`: The address of the user |
| getNFTPrice | Gets the current price of an NFT from the oracle | Public View | `tokenId`: The token ID of the NFT |
| getNormalizedIncome | Gets the reserve's normalized income | Public View | None |
| getNormalizedDebt | Gets the reserve's normalized debt | Public View | None |
| pause | Pauses the contract functions | Owner Only | None |
| unpause | Unpauses the contract functions | Owner Only | None |
| setPrimeRate | Sets the prime rate of the reserve | Owner Only | `newPrimeRate`: The new prime rate (in RAY) |
| setProtocolFeeRate | Sets the protocol fee rate | Owner Only | `newProtocolFeeRate`: The new protocol fee rate (in RAY) |
| setLiquidationThreshold | Sets the liquidation threshold | Owner Only | `newLiquidationThreshold`: The new liquidation threshold |
| setHealthFactorLiquidationThreshold | Sets the health factor liquidation threshold | Owner Only | `newHealthFactorLiquidationThreshold`: The new health factor liquidation threshold |
| setLiquidationGracePeriod | Sets the liquidation grace period | Owner Only | `newLiquidationGracePeriod`: The new liquidation grace period |
| setStabilityPool | Sets the address of the Stability Pool | Owner Only | `newStabilityPool`: The address of the new Stability Pool |
| rescueToken | Rescues tokens mistakenly sent to this contract | Owner Only | `tokenAddress`: The address of the ERC20 token<br>`recipient`: The address to send the rescued tokens to<br>`amount`: The amount of tokens to rescue |
| transferAccruedDust | Transfers accrued dust to a recipient | Owner Only | `recipient`: The address to receive the accrued dust<br>`amount`: The amount of dust to transfer |


## Implementation Details

The LendingPool is implemented in the LendingPool.sol contract.

Key features of the implementation include:

- Uses OpenZeppelin contracts for security (ReentrancyGuard, Pausable, Ownable)
- Implements ERC721Holder for handling NFT transfers
- Uses SafeERC20 for secure token transfers
- Implements an index-based system for interest accrual, similar to Compound's cToken model
- Manages loan data using a mapping of user addresses to UserData structures
- Includes functions for depositing, withdrawing, borrowing, and repaying
- Implements a liquidation process with a grace period
- Uses ReserveLibrary for managing reserve data and calculations
- Interacts with RToken and DebtToken for managing user positions

## Interactions

The LendingPool contract interacts with:

- RAAC NFT: for collateral management
- RAACHousePrices: for fetching current house prices to determine borrowing limits
- crvUSDToken: for lending and borrowing operations
- RToken: for managing user deposits and withdrawals
- DebtToken: for managing user debt positions
- Stability Pool: for allowing unclosed liquidations


## Notes

While the debt accruing is compounding, the liquidity rate is linear.  
As such, the transferAccruedDust exist so those funds can be sent to the Stability Pool for liquidation events.
