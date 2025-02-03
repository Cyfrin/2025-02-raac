# StabilityPool

## Overview

The StabilityPool is a crucial component of the RAAC lending protocol, managing deposits of rTokens, minting of deTokens, and distribution of RAAC rewards. It also plays a key role in the liquidation process and interacts with the LendingPool.

![alt text](<./stabilityPoolDiagram.png>)

## Purpose

- Manage deposits and withdrawals of rTokens
- Mint and burn deTokens
- Distribute RAAC rewards to depositors
- Handle liquidations in cooperation with the LendingPool
- Manage allocation of funds across different markets and managers

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| initialize | Initializes the StabilityPool contract | Public (initializer) | `_rToken`: Address of the RToken contract<br>`_deToken`: Address of the DEToken contract<br>`_raacToken`: Address of the RAAC token contract<br>`_raacMinter`: Address of the RAACMinter contract<br>`_crvUSDToken`: Address of the crvUSD token contract<br>`_lendingPool`: Address of the LendingPool contract |
| addManager | Adds a new manager with a specified allocation | Owner Only | `manager`: Address of the manager to add<br>`allocation`: Allocation amount for the manager |
| removeManager | Removes an existing manager | Owner Only | `manager`: Address of the manager to remove |
| updateAllocation | Updates the allocation for an existing manager | Owner Only | `manager`: Address of the manager<br>`newAllocation`: New allocation amount |
| setRAACMinter | Sets the RAACMinter contract address | Owner Only | `_raacMinter`: Address of the new RAACMinter contract |
| deposit | Allows a user to deposit rToken and receive deToken | Public | `amount`: Amount of rToken to deposit |
| withdraw | Allows a user to withdraw their rToken and RAAC rewards | Public | `deCRVUSDAmount`: Amount of deToken to redeem |
| calculateRaacRewards | Calculates the pending RAAC rewards for a user | Public View | `user`: Address of the user |
| getPendingRewards | Gets the pending RAAC rewards for a user | External View | `user`: Address of the user |
| setLiquidityPool | Sets the liquidity pool address | Owner Only | `_liquidityPool`: Address of the liquidity pool |
| depositRAACFromPool | Deposits RAAC tokens from the liquidity pool | Liquidity Pool Only | `amount`: Amount of RAAC tokens to deposit |
| addMarket | Adds a new market with a specified allocation | Owner Only | `market`: Address of the market to add<br>`allocation`: Allocation amount for the market |
| removeMarket | Removes an existing market | Owner Only | `market`: Address of the market to remove |
| updateMarketAllocation | Updates the allocation for an existing market | Owner Only | `market`: Address of the market<br>`newAllocation`: New allocation amount |
| pause | Pauses the contract | Owner Only | None |
| unpause | Unpauses the contract | Owner Only | None |
| liquidateBorrower | Liquidates a borrower | Manager or Owner Only | `userAddress`: Address of the borrower to liquidate |

## Implementation Details

The StabilityPool is implemented in the StabilityPool.sol contract.

Key features of the implementation include:

- Uses OpenZeppelin contracts for security (ReentrancyGuard, Ownable, Pausable)
- Implements an upgradeable pattern
- Manages deposits and withdrawals of rTokens
- Mints and burns deTokens based on deposits and withdrawals
- Calculates and distributes RAAC rewards to depositors
- Handles manager and market allocations
- Interacts with the LendingPool for liquidations
- Uses WadRayMath library for precise calculations

## Interactions

The StabilityPool contract interacts with:

- RToken: for managing deposits and withdrawals
- DEToken: for minting and burning tokens representing deposits
- RAACToken: for managing RAAC rewards
- RAACMinter: for minting new RAAC rewards
- LendingPool: for handling liquidations
- crvUSDToken: for managing the underlying asset

## Additional Features

- Exchange rate calculation between rToken and deToken
- Manager and market allocation management
- Liquidity pool integration for RAAC deposits
- Pausing mechanism for emergency situations