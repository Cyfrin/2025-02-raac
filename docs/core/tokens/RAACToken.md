# RAACToken

## Overview

The RAACToken is the native token of the RAAC lending protocol. It implements an ERC20 token with additional features such as minting, burning, configurable tax rates for transfers and burns, fee collection mechanism, and whitelisting functionality.

## Purpose

- Serve as the native token for the RAAC lending protocol
- Implement minting and burning functionality
- Apply configurable tax rates on token transfers and burns
- Allow for fee collection through transfers and burns
- Provide whitelisting functionality for tax-free transfers

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setMinter | Sets the minter address | Owner Only | `_minter`: Address of the new minter |
| mint | Mints new RAAC tokens | Minter Only | `to`: Address to mint tokens to<br>`amount`: Amount of tokens to mint |
| burn | Burns RAAC tokens with tax | Public | `amount`: Amount of tokens to burn |
| setFeeCollector | Sets the fee collector address | Owner Only | `_feeCollector`: Address of the new fee collector |
| setSwapTaxRate | Sets the swap tax rate | Owner Only | `_swapTaxRate`: New swap tax rate (max 10%) |
| setBurnTaxRate | Sets the burn tax rate | Owner Only | `_burnTaxRate`: New burn tax rate (max 10%) |
| setTaxRateIncrementLimit | Sets the tax rate increment limit | Owner Only | `_incrementLimit`: New increment limit |
| addToWhitelist | Adds an address to the whitelist | Owner Only | `_address`: Address to whitelist |
| removeFromWhitelist | Removes an address from the whitelist | Owner Only | `_address`: Address to remove from whitelist |
| transfer | Transfers tokens with swap tax | Public | `recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| transferFrom | Transfers tokens from another address with swap tax | Public | `sender`: Address to transfer from<br>`recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| transferWhitelisted | Transfers tokens without tax (whitelisted only) | Whitelisted | `recipient`: Address to transfer to<br>`amount`: Amount to transfer |
| transferFromWhitelisted | Transfers tokens from another address without tax (whitelisted only) | Whitelisted | `sender`: Address to transfer from<br>`recipient`: Address to transfer to<br>`amount`: Amount to transfer |

## Implementation Details

The RAACToken is implemented in the RAACToken.sol contract.

Key features of the implementation include:

- Uses OpenZeppelin's ERC20 and Ownable contracts as a base
- Implements configurable swap and burn tax rates with maximum limits
- Allows for tax-free transfers when fee collector is set to zero address
- Implements whitelisting functionality for tax-free transfers
- Uses SafeERC20 for secure token transfers
- Overrides transfer and transferFrom functions to implement the swap tax mechanism
- Implements a burn function with a separate burn tax mechanism
- Allows minting only by a designated minter address
- Provides functions for the owner to update tax rates, fee collector address, and whitelist
- Implements a tax rate increment limit to prevent sudden large changes in tax rates

## Interactions

The RAACToken contract interacts with:

- Users: for transfers, minting, and burning
- Owner: for setting the minter, fee collector addresses, tax rates, and managing the whitelist
- Minter: for minting new tokens
- Fee Collector: for receiving transfer and burn taxes
- Whitelisted addresses: for tax-free transfers

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| MinterSet | Emitted when the minter address is set | `minter`: Address of the new minter |
| FeeCollectorSet | Emitted when the fee collector address is set | `feeCollector`: Address of the new fee collector |
| SwapTaxRateUpdated | Emitted when the swap tax rate is updated | `newRate`: New swap tax rate |
| BurnTaxRateUpdated | Emitted when the burn tax rate is updated | `newRate`: New burn tax rate |
| TaxRateIncrementLimitUpdated | Emitted when the tax rate increment limit is updated | `newLimit`: New increment limit |
| AddressWhitelisted | Emitted when an address is added to the whitelist | `account`: Address added to whitelist |
| AddressRemovedFromWhitelist | Emitted when an address is removed from the whitelist | `account`: Address removed from whitelist |
| FeeCollectionEnabled | Emitted when fee collection is enabled | `feeCollector`: Address of the fee collector |
| FeeCollectionDisabled | Emitted when fee collection is disabled | None |

## Notes

- The contract includes safeguards against common vulnerabilities, but it's important to conduct regular security audits
- The tax rates and increment limits are configurable but have maximum limits to prevent abuse
- Whitelisted addresses can perform tax-free transfers, which is useful for protocol operations
- Setting the fee collector to the zero address disables fee collection, allowing all transfers to be tax-free