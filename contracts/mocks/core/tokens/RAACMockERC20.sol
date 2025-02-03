// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RAACMockERC20 is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock CRVUSD", "MCRVUSD") Ownable(initialOwner) {
        _mint(initialOwner, 100000 * 10 ** decimals());
    }

    // Admin Functions
    
    function mintTo(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}