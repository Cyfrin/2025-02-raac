# RAACMinter

## Overview

The RAACMinter is responsible for managing the minting and distribution of RAAC tokens based on a dynamic emissions schedule. It implements a flexible minting strategy that adjusts based on system utilization and includes a secure mechanism for transferring ownership of the RAACToken.

## Purpose

- Manage the minting and distribution of RAAC tokens
- Implement a dynamic emissions schedule based on system utilization
- Provide rewards to the Stability Pool
- Allow for adjustments to key parameters by the contract owner
- Control RAAC token parameters such as tax rates and fee collector
- Implement a secure, time-delayed mechanism for transferring RAACToken ownership

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|--------|------------|
| setStabilityPool | Updates the StabilityPool address | Owner Only | `_stabilityPool`: New address of the StabilityPool contract |
| setLendingPool | Updates the LendingPool address | Owner Only | `_lendingPool`: New address of the LendingPool contract |
| setSwapTaxRate | Sets the swap tax rate for the RAAC token | Owner Only | `_swapTaxRate`: The new swap tax rate |
| setBurnTaxRate | Sets the burn tax rate for the RAAC token | Owner Only | `_burnTaxRate`: The new burn tax rate |
| setFeeCollector | Sets the fee collector address for the RAAC token | Owner Only | `_feeCollector`: The new fee collector address |
| mintRewards | Mints RAAC rewards to a specified address | Stability Pool Only | `to`: Address to receive the minted RAAC tokens<br>`amount`: Amount of RAAC tokens to mint |
| getEmissionRate | Returns the current emission rate | Public View | None |
| updateEmissionRate | Updates the emission rate based on the dynamic emissions schedule | Public | None |
| tick | Triggers the minting process and updates the emission rate | Public | None |
| updateBenchmarkRate | Updates the benchmark rate for emissions | Owner Only | `_newRate`: New benchmark rate |
| setMinEmissionRate | Sets the minimum emission rate | Owner Only | `_minEmissionRate`: New minimum emission rate |
| setMaxEmissionRate | Sets the maximum emission rate | Owner Only | `_maxEmissionRate`: New maximum emission rate |
| setAdjustmentFactor | Sets the adjustment factor | Owner Only | `_adjustmentFactor`: New adjustment factor |
| setUtilizationTarget | Sets the utilization target | Owner Only | `_utilizationTarget`: New utilization target |
| setEmissionUpdateInterval | Sets the emission update interval | Owner Only | `_emissionUpdateInterval`: New emission update interval |
| getExcessTokens | Returns the current amount of excess tokens held for future distribution | Public View | None |
| emergencyShutdown | Emergency shutdown function to pause critical operations | Owner Only | None |
| resumeOperations | Resumes operations after an emergency shutdown | Owner Only | None |
| setEmergencyShutdownExemption | Sets or revokes emergency shutdown exemption for an address | Owner Only | `account`: Address to set exemption for<br>`exempt`: Boolean indicating if the account should be exempt |
| initiateRAACTokenOwnershipTransfer | Initiates the process to transfer ownership of the RAACToken | Owner Only | `_newOwner`: Address of the new owner |
| completeRAACTokenOwnershipTransfer | Completes the ownership transfer of the RAACToken if the delay period has passed | Owner Only | None |

## Implementation Details

The RAACMinter is implemented in the RAACMinter.sol contract.

Key features of the implementation include:

- Uses OpenZeppelin's Ownable for access control and ReentrancyGuard for security
- Implements a dynamic emission rate that adjusts based on system utilization
- Allows for manual triggering of the minting process through the `tick` function
- Provides functions for updating key parameters and addresses
- Implements an emergency shutdown mechanism with the ability to exempt specific addresses
- Controls RAAC token parameters such as tax rates and fee collector
- Uses a benchmark rate and adjustment factor to calculate new emission rates
- Implements an emission update interval to control the frequency of rate updates
- Implements a 7-day delay mechanism for transferring RAACToken ownership
- Provides a 24-hour window after the delay period to complete the ownership transfer

## Interactions

The RAACMinter contract interacts with:

- RAACToken: for minting new RAAC tokens, setting token parameters, and transferring token ownership
- StabilityPool: for distributing minted rewards
- LendingPool: for getting system utilization data

## Key Parameters

- `minEmissionRate`: Minimum emission rate (default: 100 RAAC per day)
- `maxEmissionRate`: Maximum emission rate (default: 2000 RAAC per day)
- `adjustmentFactor`: Percentage adjustment per update (default: 5%)
- `utilizationTarget`: Target utilization rate (default: 70%)
- `benchmarkRate`: Benchmark rate for emissions
- `emissionUpdateInterval`: Minimum time between emission rate updates
- `OWNERSHIP_TRANSFER_DELAY`: The delay period for RAACToken ownership transfer (7 days)

## Notes

- The contract uses a block-based emission rate but updates are time-based to prevent excessive updates
- Excess tokens are stored for future distribution to manage any discrepancies between minted and distributed tokens
- The contract includes safeguards against common vulnerabilities, but it's important to conduct regular security audits
- The contract includes an emergency shutdown mechanism with the ability to exempt specific addresses and resume operations
- The RAACToken ownership transfer process includes a 7-day delay and a 24-hour completion window for added security
- Only the contract owner can initiate and complete the RAACToken ownership transfer process