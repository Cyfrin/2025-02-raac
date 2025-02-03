# RAACHousePriceOracle

## Overview

The RAACHousePriceOracle is a Chainlink Functions-enabled oracle that fetches and updates house pricing data from off-chain APIs. It acts as a secure bridge between the RAAC protocol and external real estate pricing data sources.

## Purpose

- Fetch real-time house pricing data from off-chain sources
- Securely update house prices in the RAACHousePrices contract
- Manage Chainlink Functions requests and responses
- Provide a trusted price feed for the RAAC protocol
- Ensure data integrity through owner-controlled updates

## Access Control

The contract implements access control with distinct roles:

| Role | Description |
|------|-------------|
| Owner | Can send price update requests and manage DON ID |
| Router | Chainlink Functions Router that processes requests |

## Key Functions

| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| sendRequest | Triggers an on-demand Functions request | Owner | `source`: JavaScript code, `secretsLocation`: Location enum, `encryptedSecretsReference`: bytes, `args`: string[], `bytesArgs`: bytes[], `subscriptionId`: uint64, `callbackGasLimit`: uint32 |
| setDonId | Updates the DON ID | Owner | `newDonId`: bytes32 |
| fulfillRequest | Processes oracle response | Internal | `requestId`: bytes32, `response`: bytes, `err`: bytes |
| stringToUint | Converts string to uint | Internal | `s`: string |

## Implementation Details

The component implements:

- Integration with Chainlink Functions Client
- Secure price updates through oracle responses
- Error handling for failed requests
- House ID tracking for price updates
- Event emission for price changes

Dependencies:
- @chainlink/contracts/FunctionsClient
- @chainlink/contracts/ConfirmedOwner
- @chainlink/contracts/FunctionsRequest
- RAACHousePrices contract

## Events

| Name | Description |
|------|-------------|
| HousePriceUpdated | Emitted when a house price is updated with new value |

## Error Conditions

| Name | Description |
|------|-------------|
| FulfillmentFailed | Oracle response processing failed |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy MockFunctionsRouter
   - Deploy RAACHousePrices contract
   - Deploy RAACHousePriceOracle with router and DON ID
   - Set oracle address in RAACHousePrices

2. Test Categories:
   - Access control verification
   - Request handling
   - Response processing
   - Price update validation
   - Error handling

## Notes

- Requires valid Chainlink Functions subscription
- DON ID must be set during construction
- Only processes valid responses from authorized Chainlink nodes
- House prices are updated through the RAACHousePrices contract
- Integration setup handled through deployment process
- Security considerations for owner-only functions 