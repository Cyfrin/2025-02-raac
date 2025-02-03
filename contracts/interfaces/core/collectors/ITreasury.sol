// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ITreasury Interface
 * @notice Interface for the Treasury contract that manages protocol fund storage and allocation
 * @dev Defines core functionality for treasury operations and fund management
 */
interface ITreasury {
    /**
     * @notice Core treasury functions
     */

    /**
     * @notice Deposits tokens into the treasury
     * @dev Requires prior token approval
     * @param token Address of token to deposit
     * @param amount Amount of tokens to deposit
     */
    function deposit(address token, uint256 amount) external;

    /**
     * @notice Withdraws tokens from the treasury
     * @dev Only callable by MANAGER_ROLE
     * @param token Address of token to withdraw
     * @param amount Amount of tokens to withdraw
     * @param recipient Address to receive the tokens
     */
    function withdraw(address token, uint256 amount, address recipient) external;

    /**
     * @notice Allocates funds to a recipient
     * @dev Only callable by ALLOCATOR_ROLE
     * @param recipient Address to allocate funds to
     * @param amount Amount of funds to allocate
     */
    function allocateFunds(address recipient, uint256 amount) external;

    /**
     * @notice View functions
     */

    /**
     * @notice Gets total value held by treasury
     * @return Total value across all tokens
     */
    function getTotalValue() external view returns (uint256);

    /**
     * @notice Gets balance of specific token
     * @param token Address of token to check
     * @return Balance of specified token
     */
    function getBalance(address token) external view returns (uint256);

    /**
     * @notice Gets allocation amount for recipient from specific allocator
     * @param allocator Address of the allocator
     * @param recipient Address of the recipient
     * @return Allocated amount
     */
    function getAllocation(address allocator, address recipient) external view returns (uint256);

    /**
     * @notice Events
     */

    /**
     * @dev Emitted when tokens are deposited into treasury
     * @param token Address of the deposited token
     * @param amount Amount of tokens deposited
     */
    event Deposited(address indexed token, uint256 amount);

    /**
     * @dev Emitted when tokens are withdrawn from treasury
     * @param token Address of the withdrawn token
     * @param amount Amount of tokens withdrawn
     * @param recipient Address receiving the tokens
     */
    event Withdrawn(address indexed token, uint256 amount, address indexed recipient);

    /**
     * @dev Emitted when funds are allocated to a recipient
     * @param recipient Address receiving the allocation
     * @param amount Amount of funds allocated
     */
    event FundsAllocated(address indexed recipient, uint256 amount);

    /**
     * @notice Custom errors
     */

    /**
     * @dev When token address is invalid (zero address)
     */
    error InvalidAddress();

    /**
     * @dev When amount is zero or exceeds maximum
     */
    error InvalidAmount();

    /**
     * @dev When recipient address is invalid (zero address)
     */
    error InvalidRecipient();

    /**
     * @dev When balance is insufficient for withdrawal
     */
    error InsufficientBalance();

    /**
     * @dev When caller lacks required role
     */
    error UnauthorizedCaller();
}
