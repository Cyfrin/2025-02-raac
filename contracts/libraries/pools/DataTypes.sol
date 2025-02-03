// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library DataTypes {
  struct LoanData {
    address collateralOwner;     // The owner of the collateral (NFT)
    address loanInitiator;       // The address that initiated the loan
    bool isActive;               // Whether the loan is currently active
    uint256 maxBorrowAmount;     // The maximum amount that can be borrowed against this collateral
    uint256 borrowedAmount;      // The current amount borrowed
    uint256 lastUpdateIndex;     // The index at which the loan was last updated
  }
}