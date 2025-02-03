# LPToken

## Overview

The LPToken is an ERC20 token implementation designed for liquidity pool representation in the RAAC protocol. It features controlled minting and burning capabilities with separate role-based access for each operation.

## Purpose

- Represent liquidity pool shares in the protocol
- Provide controlled minting and burning mechanisms
- Enable separate minter and burner roles
- Maintain standard ERC20 functionality
- Ensure secure token operations with role validation

## Access Control

The contract implements role-based access control:

| Role | Description |
|------|-------------|
| Owner | Can set minter and burner addresses |
| Minter | Can mint new tokens |
| Burner | Can burn existing tokens |

## Key Functions

| Name | Description | Access | Parameters |
|------|-------------|---------|------------|
| constructor | Initializes token with name, symbol, and owner | Once | `name`: string, `symbol`: string, `initialOwner`: address |
| mint | Creates new tokens | Minter | `to`: address, `amount`: uint256 |
| burn | Destroys existing tokens | Burner | `from`: address, `amount`: uint256 |
| setMinter | Updates minter address | Owner | `newMinter`: address |
| setBurner | Updates burner address | Owner | `newBurner`: address |

## Implementation Details

The component implements:

- Standard ERC20 functionality
- Role-based access control
- Separate minting and burning capabilities
- Address validation for all operations
- Owner management for roles

Dependencies:
- OpenZeppelin: ERC20
- OpenZeppelin: Ownable

## Error Conditions

| Name | Description |
|------|-------------|
| InvalidAddress | Zero address provided or unauthorized caller |

### Test Setup Requirements

1. Contract Deployment:
   - Deploy with name, symbol, and initial owner
   - Set up minter and burner roles
   - Verify access controls

2. Test Categories:
   - Basic ERC20 functionality
   - Minting operations
   - Burning operations
   - Role management
   - Access control verification
   - Address validation

## Notes

- Minter and burner roles can be the same address
- Initial owner is set as both minter and burner
- Roles can be updated independently
- Inherits standard ERC20 features
- No maximum supply limit implemented
- All role changes require owner approval
- Zero address checks on all critical operations 