// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IndexToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    error InvalidAddress();
    
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert InvalidAddress();
        _mint(to, amount);
    }
}