// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract crvUSDToken is ERC20, Ownable {
    using SafeERC20 for IERC20;

    address public minter;

    constructor(address initialOwner) ERC20("Curve USD", "crvUSD") Ownable(initialOwner) {
        minter = initialOwner;
    }

    function mint(address to, uint256 amount) external {
        // We allow everyone to mint
        // require(msg.sender == minter, "Only minter can mint");
        _mint(to, amount);
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        unchecked {
            _approve(account, msg.sender, currentAllowance - amount);
        }
        _burn(account, amount);
    }
}