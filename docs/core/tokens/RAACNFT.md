# RAACNFT

## Overview

The RAACNFT is an ERC721 token representing real estate assets in the RAAC lending protocol. It implements minting functionality tied to house prices and allows for batch minting of NFTs.

## Purpose

- Represent real estate assets as NFTs in the RAAC lending protocol
- Implement minting functionality based on house prices
- Allow for batch minting of NFTs
- Provide enumeration capabilities for NFTs

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| mint | Mints a new RAAC NFT | Public | `_tokenId`: ID of the token to mint<br>`_amount`: Amount of ERC20 tokens to pay for minting |
| getHousePrice | Gets the price of a house for a given token ID | Public View | `_tokenId`: ID of the token |
| addNewBatch | Adds a new batch of NFTs | Owner Only | `_batchSize`: Size of the new batch to add |
| setBaseUri | Sets the base URI for token metadata | Owner Only | `_uri`: New base URI |

## Implementation Details

The RAACNFT is implemented in the RAACNFT.sol contract.

Key features of the implementation include:

- Inherits from ERC721, ERC721Enumerable, and Ownable
- Uses an external contract (IRAACHousePrices) to determine house prices
- Implements batch minting functionality
- Uses SafeERC20 for secure token transfers during minting
- Allows setting of base URI for token metadata

## Interactions

The RAACNFT contract interacts with:

- Users: for minting NFTs
- Owner: for adding new batches and setting the base URI
- IRAACHousePrices: for getting house prices
- ERC20 Token: for payment during minting
