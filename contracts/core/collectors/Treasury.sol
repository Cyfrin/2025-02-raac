// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/core/collectors/ITreasury.sol";

/**
 * @title Treasury Contract
 * @author RAAC Protocol Team
 * @notice Manages protocol treasury funds with role-based access control
 * @dev Implements secure fund management with deposit/withdraw functionality and fund allocation tracking
 * Key features:
 * - Role-based access control for managers and allocators
 * - Multi-token support with balance tracking
 * - Fund allocation system
 */
contract Treasury is ITreasury, AccessControl, ReentrancyGuard {
    // Access control roles
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");    // Can withdraw funds
    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE"); // Can allocate funds
    
    // State variables
    mapping(address => uint256) private _balances;                        // Token balances
    mapping(address => mapping(address => uint256)) private _allocations; // Allocator => recipient => amount
    uint256 private _totalValue;                                         // Total value across all tokens

    /**
     * @notice Initializes the Treasury contract with admin roles
     * @dev Grants admin all roles initially for setup
     * @param admin Address to receive initial admin roles
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
        _grantRole(ALLOCATOR_ROLE, admin);
    }

    /**
     * @notice Deposits tokens into the treasury
     * @dev Requires approval for token transfer
     * @param token Address of token to deposit
     * @param amount Amount of tokens to deposit
     */
    function deposit(address token, uint256 amount) external override nonReentrant {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        _balances[token] += amount;
        _totalValue += amount;
        
        emit Deposited(token, amount);
    }

    /**
     * @notice Withdraws tokens from the treasury
     * @dev Only callable by accounts with MANAGER_ROLE
     * @param token Address of token to withdraw
     * @param amount Amount of tokens to withdraw
     * @param recipient Address to receive the tokens
     */
    function withdraw(
        address token,
        uint256 amount,
        address recipient
    ) external override nonReentrant onlyRole(MANAGER_ROLE) {
        if (token == address(0)) revert InvalidAddress();
        if (recipient == address(0)) revert InvalidRecipient();
        if (_balances[token] < amount) revert InsufficientBalance();
        
        _balances[token] -= amount;
        _totalValue -= amount;
        IERC20(token).transfer(recipient, amount);
        
        emit Withdrawn(token, amount, recipient);
    }

    /**
     * @notice Allocates funds to a recipient
     * @dev Only callable by accounts with ALLOCATOR_ROLE
     * Records allocation without transferring tokens
     * @param recipient Address to allocate funds to
     * @param amount Amount of funds to allocate
     */
    function allocateFunds(
        address recipient,
        uint256 amount
    ) external override onlyRole(ALLOCATOR_ROLE) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        
        _allocations[msg.sender][recipient] = amount;
        emit FundsAllocated(recipient, amount);
    }

    /**
     * @notice Gets total value held by treasury
     * @return Total value across all tokens
     */
    function getTotalValue() external view override returns (uint256) {
        return _totalValue;
    }

    /**
     * @notice Gets balance of specific token
     * @param token Address of token to check
     * @return Balance of specified token
     */
    function getBalance(address token) external view returns (uint256) {
        return _balances[token];
    }

    /**
     * @notice Gets allocation amount for recipient from specific allocator
     * @param allocator Address of the allocator
     * @param recipient Address of the recipient
     * @return Allocated amount
     */
    function getAllocation(address allocator, address recipient) external view returns (uint256) {
        return _allocations[allocator][recipient];
    }
}
