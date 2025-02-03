# RAACHousePrices

## Overview

The RAACHousePrices contract serves as a price oracle for RAAC NFTs, storing and managing house prices associated with specific token IDs.

## Purpose

- Store and manage house prices for RAAC NFTs
- Allow updates to house prices through an authorized oracle
- Provide a mechanism for retrieving the latest price for a given token ID

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setOracle | Sets the address of the authorized oracle | Owner Only | `_oracle`: Address of the new oracle |
| updatePriceFromOracle | Updates the price of a token from the oracle | Oracle Only | `_tokenId`: ID of the token to update<br>`_newPrice`: New price for the token |
| getLatestPrice | Retrieves the latest price and timestamp for a token | Public View | `_tokenId`: ID of the token |
| setHousePrice | Manually sets the price for a token | Owner Only | `_tokenId`: ID of the token to update<br>`_amount`: New price for the token |

## Implementation Details

The RAACHousePrices is implemented in the RAACHousePrices.sol contract.

Key features of the implementation include:

- Uses OpenZeppelin's Ownable for access control
- Stores house prices in a mapping of token IDs to prices
- Implements a time-based update interval to prevent too frequent price updates
- Allows for both oracle-based and manual price updates

## Interactions

The RAACHousePrices contract interacts with:

- Oracle: An external entity authorized to update prices
- Owner: For setting the oracle address and manual price updates
- Other contracts: For querying the latest prices of tokens
