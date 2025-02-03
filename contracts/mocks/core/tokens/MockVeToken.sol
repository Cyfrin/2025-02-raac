// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../../interfaces/core/tokens/IveRAACToken.sol";

contract MockVeToken is IveRAACToken, ERC20 {
    mapping(address => uint256) private _votingPower;
    uint256 private _totalVotingPower;

    constructor() ERC20("Mock veToken", "veTKN") {}

    // Override transfer functions from both interfaces
    function transfer(address to, uint256 amount) public virtual override(IveRAACToken, ERC20) returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override(IveRAACToken, ERC20) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function mock_setVotingPower(address account, uint256 amount) external {
        _votingPower[account] = amount;
    }

    function mock_setTotalSupply(uint256 amount) external {
        _totalVotingPower = amount;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
        _votingPower[to] += amount;
        _totalVotingPower += amount;
    }

    function setBalance(address account, uint256 balance) external {
        uint256 currentBalance = balanceOf(account);
        if (currentBalance < balance) {
            _mint(account, balance - currentBalance);
            _votingPower[account] += (balance - currentBalance);
            _totalVotingPower += (balance - currentBalance);
        } else if (currentBalance > balance) {
            _burn(account, currentBalance - balance);
            _votingPower[account] -= (currentBalance - balance);
            _totalVotingPower -= (currentBalance - balance);
        }
    }

    // Required interface implementations
    function lock(uint256, uint256) external pure override {
        // Mock implementation
    }

    function extend(uint256) external pure override {
        // Mock implementation
    }

    function increase(uint256) external pure override {
        // Mock implementation
    }

    function withdraw() external pure override {
        // Mock implementation
    }

    function setMinter(address) external pure override {
        // Mock implementation
    }

    function calculateVeAmount(uint256 amount, uint256 lockDuration) external pure override returns (uint256) {
        return amount * lockDuration / 1461 days; // 4 years in days
    }

    function getVotingPower(address account) external view override returns (uint256) {
        return _votingPower[account];
    }

    function getVotingPower(address account, uint256) external view override returns (uint256) {
        return _votingPower[account];
    }

    function getTotalVotingPower() external view override returns (uint256) {
        return _totalVotingPower;
    }

    function getLockPosition(address) external pure override returns (LockPosition memory) {
        return LockPosition(0, 0, 0);
    }

    function mock_setInitialVotingPower(address account, uint256 amount) external {
        _votingPower[account] = amount;
        _mint(account, amount);
        _totalVotingPower = amount;
    }
}

