// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../interfaces/core/collectors/ITreasury.sol";

contract MockTreasury is ITreasury {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allocations;
    uint256 private _totalValue;

    function deposit(address token, uint256 amount) external override {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        _balances[token] += amount;
        _totalValue += amount;
        
        emit Deposited(token, amount);
    }

    function withdraw(address token, uint256 amount, address recipient) external override {
        if (token == address(0)) revert InvalidAddress();
        if (recipient == address(0)) revert InvalidRecipient();
        if (_balances[token] < amount) revert InsufficientBalance();

        _balances[token] -= amount;
        _totalValue -= amount;
        IERC20(token).transfer(recipient, amount);
        
        emit Withdrawn(token, amount, recipient);
    }

    function allocateFunds(address recipient, uint256 amount) external override {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        
        _allocations[msg.sender][recipient] = amount;
        emit FundsAllocated(recipient, amount);
    }

    function getTotalValue() external view override returns (uint256) {
        return _totalValue;
    }

    function getBalance(address token) external view override returns (uint256) {
        return _balances[token];
    }

    function getAllocation(address allocator, address recipient) external view override returns (uint256) {
        return _allocations[allocator][recipient];
    }

    // Mock helper functions
    function mock_setBalance(address token, uint256 amount) external {
        _balances[token] = amount;
        _totalValue = amount;
    }

    function mock_setAllocation(address allocator, address recipient, uint256 amount) external {
        _allocations[allocator][recipient] = amount;
    }
}
