# DataTypes

## Overview

Standardized types for managing loan-related data and ensures consistent data representation across the protocol.

## Purpose

- Define standardized data structures for protocol operations

## Key Structures

### LoanData

The primary data structure representing loan information in the protocol:

| Field | Type | Description |
|-------|------|-------------|
| collateralOwner | address | The address that owns the NFT collateral |
| loanInitiator | address | The address that initiated the loan transaction |
| isActive | bool | Flag indicating if the loan is currently active |
| maxBorrowAmount | uint256 | Maximum amount that can be borrowed against the collateral |
| borrowedAmount | uint256 | Current amount borrowed against the collateral |
| lastUpdateIndex | uint256 | Index at which the loan was last updated |

### Field Details

1. **Address Fields**
   - `collateralOwner`: NFT owner address
   - `loanInitiator`: Loan creator address
   - Both addresses may differ in cases of delegated loan creation

2. **State Fields**
   - `isActive`: Tracks loan status
   - `lastUpdateIndex`: Used for state change tracking

3. **Amount Fields**
   - `maxBorrowAmount`: Collateral-based borrowing limit
   - `borrowedAmount`: Current outstanding loan amount

## Usage Guidelines

1. **Importing**
   ```solidity
   import "../../libraries/pools/DataTypes.sol";
   ```

2. **Struct Creation**
   ```solidity
   DataTypes.LoanData memory loan = DataTypes.LoanData({
       collateralOwner: owner,
       loanInitiator: initiator,
       isActive: true,
       maxBorrowAmount: amount,
       borrowedAmount: 0,
       lastUpdateIndex: currentIndex
   });
   ```

3. **Field Access**
   ```solidity
   require(loan.borrowedAmount <= loan.maxBorrowAmount, "Exceeds limit");
   ```

## Integration Points

The library is used by:

- Lending pool contracts
- Loan management systems
- Collateral management contracts
- Protocol governance systems

## Test Setup Requirements

1. Library Import:
   - Import DataTypes in test files
   - Use struct in test fixtures

2. Test Data Setup:
   - Mock addresses for owners and initiators
   - Valid amount ranges for borrowing
   - Index simulation for updates

## Notes

- All monetary values use protocol-standard decimals
- Struct is optimized for minimum storage slots
- No validation logic is included in the library
- Fields are immutable once set
