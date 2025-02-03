# RAACPrimeRateOracle

## Overview

The RAACPrimeRateOracle is a Chainlink Functions-enabled oracle that fetches and updates prime rate data from off-chain APIs. It serves as the authoritative source for prime rate updates in the RAAC lending protocol.

## Purpose

- Fetch real-time prime rate data from off-chain sources
- Securely update prime rates in the LendingPool contract
- Manage Chainlink Functions requests and responses
- Provide a trusted prime rate feed for the lending protocol
- Track historical prime rate updates with timestamps

## Access Control

The contract implements access control with distinct roles:

| Role | Description |
|------|-------------|
| Owner | Can send prime rate update requests and manage DON ID |
| Router | Chainlink Functions Router that processes requests |

## Key Functions

| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| sendRequest | Triggers an on-demand Functions request | Owner | `source`: JavaScript code, `secretsLocation`: Location enum, `encryptedSecretsReference`: bytes, `args`: string[], `bytesArgs`: bytes[], `subscriptionId`: uint64, `callbackGasLimit`: uint32 |
| setDonId | Updates the DON ID | Owner | `newDonId`: bytes32 |
| fulfillRequest | Processes oracle response | Internal | `requestId`: bytes32, `response`: bytes, `err`: bytes |
| getPrimeRate | Returns the latest prime rate | External View | None |

## Implementation Details

The component implements:

- Integration with Chainlink Functions Client
- Secure prime rate updates through oracle responses
- Error handling for failed requests
- Timestamp tracking for rate updates
- Direct integration with LendingPool contract

Dependencies:
- @chainlink/contracts/FunctionsClient
- @chainlink/contracts/ConfirmedOwner
- @chainlink/contracts/FunctionsRequest
- ILendingPool interface

## Events

| Name | Description |
|------|-------------|
| PrimeRateUpdated | Emitted when prime rate is updated with new value |

## Error Conditions

| Name | Description |
|------|-------------|
| FulfillmentFailed | Oracle response processing failed |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy MockFunctionsRouter
   - Deploy LendingPool contract
   - Deploy RAACPrimeRateOracle with router and DON ID
   - Set oracle address in LendingPool

2. Test Categories:
   - Access control verification
   - Request handling
   - Response processing
   - Rate update validation
   - Integration with LendingPool
   - Error handling

## Notes

- Requires valid Chainlink Functions subscription
- DON ID must be set during construction
- Only processes valid responses from authorized Chainlink nodes
- Prime rate updates are forwarded to LendingPool contract
- Integration setup handled through deployment process
- Rate changes may be subject to limits in LendingPool
- Historical data maintained through lastUpdateTimestamp 