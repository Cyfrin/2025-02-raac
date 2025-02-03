// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IZENO is IERC20 {
    struct ZENODetails {
        address zenoAddress;
        uint256 maturityDate;
        string name;
        string symbol;
    }

    error BondNotRedeemable();
    error ZeroAmount();
    error InsufficientBalance();

    function mint(address to, uint256 amount) external;
    function isRedeemable() external view returns (bool);
    function redeem(uint256 amount) external;
    function redeemAll() external;
    function getDetails() external view returns (ZENODetails memory);
    function totalZENOMinted() external view returns (uint256);
    function totalZENORedeemed() external view returns (uint256);
} 