# Treasury

## Overview

The Treasury is a core contract designed to manage protocol fund.  
It provides functionality for deposits, withdrawals, and fund allocation tracking with role-based access control.

## Purpose

- Securely manage protocol funds with multi-token support
- Implement role-based access control for fund management
- Track fund allocations and balances

## Access Control

The contract implements OpenZeppelin's AccessControl with three distinct roles:

| Role | Description |
|------|-------------|
| DEFAULT_ADMIN_ROLE | Can manage all roles and contract administration |
| MANAGER_ROLE | Can withdraw funds from treasury |
| ALLOCATOR_ROLE | Can allocate funds to recipients |

## Key Functions

| Function Name | Description | Access | Parameters |
|---------------|-------------|---------|------------|
| constructor | Initializes the Treasury contract with admin roles | - | `admin`: Initial admin address |
| deposit | Deposits tokens into treasury | Any | `token`: Token address<br>`amount`: Amount to deposit |
| withdraw | Withdraws tokens from treasury | MANAGER_ROLE | `token`: Token address<br>`amount`: Amount to withdraw<br>`recipient`: Recipient address |
| allocateFunds | Allocates funds to recipient | ALLOCATOR_ROLE | `recipient`: Recipient address<br>`amount`: Amount to allocate |
| getTotalValue | Gets total value in treasury | Any | None |
| getBalance | Gets balance of specific token | Any | `token`: Token address |
| getAllocation | Gets allocation for recipient | Any | `allocator`: Allocator address<br>`recipient`: Recipient address |

### Constructor Details

The constructor performs the following initializations:

1. **Role Assignments**
   - Grants DEFAULT_ADMIN_ROLE to admin
   - Grants MANAGER_ROLE to admin
   - Grants ALLOCATOR_ROLE to admin

2. **Parameter Validation**
   - Validates admin address is non-zero

## State Management

The contract maintains several key state variables:

1. **Token Balances**
   - Tracks individual token balances
   - Updated on deposits and withdrawals
   - Accessible via `getBalance(token)`

2. **Fund Allocations**
   - Maps allocator => recipient => amount
   - Records intended fund distributions
   - Does not affect actual token balances

3. **Total Value**
   - Tracks aggregate value across all tokens
   - Updated on deposits and withdrawals
   - Accessible via `getTotalValue()`

## Implementation Details

The Treasury:

- Uses OpenZeppelin contracts (AccessControl, ReentrancyGuard)
- Implements ITreasury interface

## Events

The contract emits events for all significant state changes:

| Event | Description |
|-------|-------------|
| Deposited | When tokens are deposited |
| Withdrawn | When tokens are withdrawn |
| FundsAllocated | When funds are allocated |

## Error Conditions

The contract includes several custom error conditions:

| Error | Description |
|-------|-------------|
| InvalidAddress | When token address is zero |
| InvalidAmount | When amount is zero |
| InvalidRecipient | When recipient address is zero |
| InsufficientBalance | When withdrawal exceeds balance |

### Test Setup Requirements

1. Contract Deployments:
   - MockToken (for testing)
   - Treasury

2. Role Assignments:
   - MANAGER_ROLE
   - ALLOCATOR_ROLE

3. Initial Configurations:
   - Token approvals
   - Initial token minting

## Notes

- The contract supports multiple ERC20 tokens
- Allocations are tracked separately from actual balances
- All monetary values use token-specific decimals 