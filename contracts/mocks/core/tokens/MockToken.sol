// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 private _decimals;
    mapping(address => uint256) private _votingPower;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
        _votingPower[account] = amount;
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
        _votingPower[account] -= amount;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // veToken interface methods
    function getVotingPower(address account) external view returns (uint256) {
        return _votingPower[account];
    }

    function getTotalVotingPower() external view returns (uint256) {
        return totalSupply();
    }

    // Additional helper for tests
    function setVotingPower(address account, uint256 amount) external {
        _votingPower[account] = amount;
    }
}