# FeeCollector

## Overview

The FeeCollector is a smart contract designed to manage protocol fee collection. It provides functionality for securely managing and transferring collected fees to various stakeholders including veRAAC holders, treasury, and repair fund.

## Purpose

- Collect and manage various types of protocol fees in RAAC tokens
- Implement time-weighted reward distribution to veRAAC holders (claimable by address)

## Access Control

The contract implements OpenZeppelin's AccessControl with three distinct roles:

| Role | Description |
|------|-------------|
| FEE_MANAGER_ROLE | Controls fee parameters and distribution rules |
| EMERGENCY_ROLE | Can pause contract and execute emergency functions |
| DISTRIBUTOR_ROLE | Authorized to trigger fee distributions |

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|---------|------------|
| constructor | Initializes the FeeCollector contract with initial state and roles | - | `_raacToken`: RAAC token contract address<br>`_veRAACToken`: veRAAC token contract address<br>`_treasury`: Initial treasury address<br>`_repairFund`: Initial repair fund address<br>`_admin`: Initial admin address |
| collectFee | Collects fees of a specific type | Any | `amount`: Amount to collect<br>`feeType`: Type of fee (0-7) |
| distributeCollectedFees | Distributes collected fees | DISTRIBUTOR_ROLE | None |
| claimRewards | Claims accumulated rewards | Any | `user`: Address claiming rewards |
| updateFeeType | Updates fee type parameters | FEE_MANAGER_ROLE | `feeType`: Fee type to update<br>`newFee`: New parameters |
| setTreasury | Initiates treasury update | Admin | `newTreasury`: New treasury address |
| setRepairFund | Initiates repair fund update | Admin | `newRepairFund`: New repair fund address |
| emergencyWithdraw | Emergency token withdrawal | EMERGENCY_ROLE | `token`: Token to withdraw |
| pause/unpause | Emergency pause controls | EMERGENCY_ROLE | None |

### Constructor Details

The constructor performs the following initializations:

1. **Parameter Validation**
   - Validates all input addresses are non-zero
   - Reverts with `InvalidAddress` if any address is zero

2. **Contract State Setup**
   - Sets RAAC token contract reference
   - Sets veRAAC token contract reference
   - Sets initial treasury address
   - Sets initial repair fund address

3. **Role Assignments**
   - Grants DEFAULT_ADMIN_ROLE to admin
   - Grants FEE_MANAGER_ROLE to admin
   - Grants EMERGENCY_ROLE to admin
   - Grants DISTRIBUTOR_ROLE to admin

4. **Protocol Initialization**
   - Initializes fee types with protocol rules
   - Sets up initial distribution period:
     - startTime: current block timestamp
     - endTime: current timestamp + 7 days

## Fee Types

The contract supports 8 different fee types (0-7):

1. Protocol Fees (0): General operations
2. Lending Fees (1): Lending/borrowing activities
3. Performance Fees (2): Yield products
4. Insurance Fees (3): NFT loan insurance
5. Mint/Redeem Fees (4): Token operations
6. Vault Fees (5): Vault management
7. Swap Tax (6): Trading operations
8. NFT Royalties (7): NFT transactions

Each fee type has configurable distribution parameters:
- veRAACShare: Percentage for veRAAC holders
- burnShare: Percentage for token burning
- repairShare: Percentage for repair fund
- treasuryShare: Percentage for treasury

## Time-Weighted Distribution

The contract implements a sophisticated time-weighted distribution mechanism:

- Uses [TimeWeightedAverage](/core/libraries/math/TimeWeightedAverage) library for calculations
- Distribution periods of 7 days
- Rewards based on user's veRAAC voting power
- Accounts for total voting power changes

## Implementation Details

The FeeCollector:

- Uses OpenZeppelin contracts (AccessControl, ReentrancyGuard, Pausable, SafeERC20)
- Implements IFeeCollector interface

## Address Update Mechanism

The contract implements a time-delayed update mechanism for critical addresses:

1. Admin initiates update with `setTreasury` or `setRepairFund`
2. Update is stored in a PendingUpdate struct with:
   - newAddress: Proposed new address
   - effectiveTime: Timestamp when change can be executed
3. After delay period (1 day), update can be applied by calling `applyTreasuryUpdate`
## Events

The contract emits events for all significant state changes:

| Event | Description |
|-------|-------------|
| FeeCollected | When fees are collected |
| FeeDistributed | When fees are distributed |
| RewardClaimed | When rewards are claimed |
| FeeTypeUpdated | When fee parameters change |
| TreasuryUpdated | When treasury address changes |
| RepairFundUpdated | When repair fund changes |
| EmergencyWithdrawal | During emergency withdrawals |
| DistributionParametersUpdated | When distribution parameters change |

### Test Setup Requirements

1. Contract Deployments:
   - RAACToken
   - veRAACToken
   - FeeCollector

2. Role Assignments:
   - FEE_MANAGER_ROLE
   - EMERGENCY_ROLE
   - DISTRIBUTOR_ROLE

3. Initial Configurations:
   - Token approvals
   - Whitelist settings
   - Fee type parameters
   - Initial token minting

## Notes

- The contract uses basis points for percentage calculations (10000 = 100%)
- Maximum single fee amount is currently capped at temp 1M tokens 