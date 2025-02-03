// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockFeeCollectorToken is ERC20, Ownable {
    mapping(address => uint256) private _votingPower;
    uint256 private _totalVotingPower;
    bool public burnEnabled;

    constructor(
        string memory name, 
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        burnEnabled = true;
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
        _votingPower[account] += amount;
        _totalVotingPower += amount;
    }

    function burn(uint256 amount) external {
        require(burnEnabled, "Burn not enabled");
        _burn(msg.sender, amount);
        _votingPower[msg.sender] -= amount;
        _totalVotingPower -= amount;
    }

    function getTotalVotingPower() external view returns (uint256) {
        return _totalVotingPower;
    }

    function getVotingPower(address account) external view returns (uint256) {
        return _votingPower[account];
    }

    function setVotingPower(address account, uint256 amount) external onlyOwner {
        uint256 oldPower = _votingPower[account];
        _votingPower[account] = amount;
        _totalVotingPower = _totalVotingPower - oldPower + amount;
    }

    function toggleBurn() external onlyOwner {
        burnEnabled = !burnEnabled;
    }
}
