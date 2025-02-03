// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IStabilityPool
 * @author RegnumAurumAcquisitionCorp
 * @notice Interface for the Stability Pool contract that manages deposits, withdrawals, and liquidations
 * @dev Handles user deposits of rToken, minting of deToken, and RAAC rewards distribution
 */
interface IStabilityPool {
    /* ========== CORE FUNCTIONS ========== */

    /**
     * @notice Allows users to deposit rToken and receive deToken
     * @param amount Amount of rToken to deposit
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Allows users to withdraw their rToken and RAAC rewards
     * @param deCRVUSDAmount Amount of deToken to redeem
     */
    function withdraw(uint256 deCRVUSDAmount) external;

    /**
     * @notice Liquidates a borrower's position
     * @param userAddress The address of the borrower to liquidate
     */
    function liquidateBorrower(address userAddress) external;

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Gets the current exchange rate between rToken and deToken
     * @return Current exchange rate
     */
    function getExchangeRate() external view returns (uint256);

    /**
     * @notice Calculates the amount of deToken to mint for a given rToken deposit
     * @param rcrvUSDAmount Amount of rToken deposited
     * @return Amount of deToken to mint
     */
    function calculateDeCRVUSDAmount(uint256 rcrvUSDAmount) external view returns (uint256);

    /**
     * @notice Calculates the amount of rToken to return for a given deToken redemption
     * @param deCRVUSDAmount Amount of deToken to redeem
     * @return Amount of rToken to return
     */
    function calculateRcrvUSDAmount(uint256 deCRVUSDAmount) external view returns (uint256);

    /**
     * @notice Calculates the pending RAAC rewards for a user
     * @param user Address of the user
     * @return Amount of RAAC rewards
     */
    function calculateRaacRewards(address user) external view returns (uint256);

    /**
     * @notice Gets the pending RAAC rewards for a user
     * @param user Address of the user
     * @return Amount of pending RAAC rewards
     */
    function getPendingRewards(address user) external view returns (uint256);

    /**
     * @notice Gets the total deposits in the pool
     * @return Total deposits amount
     */
    function getTotalDeposits() external view returns (uint256);

    /**
     * @notice Gets the deposit amount for a user
     * @param user Address of the user
     * @return Deposit amount
     */
    function getUserDeposit(address user) external view returns (uint256);

    /**
     * @notice Gets the balance of a user
     * @param user Address of the user
     * @return Balance of the user
     */
    function balanceOf(address user) external view returns (uint256);

    /* ========== MANAGER FUNCTIONS ========== */

    /**
     * @notice Gets the allocation for a manager
     * @param manager Address of the manager
     * @return Allocation amount
     */
    function getManagerAllocation(address manager) external view returns (uint256);

    /**
     * @notice Gets the total allocation across all managers
     * @return Total allocation amount
     */
    function getTotalAllocation() external view returns (uint256);

    /**
     * @notice Checks if an address is a manager
     * @param manager Address to check
     * @return True if the address is a manager
     */
    function getManager(address manager) external view returns (bool);

    /**
     * @notice Gets the list of all managers
     * @return Array of manager addresses
     */
    function getManagers() external view returns (address[] memory);

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Adds a new manager with a specified allocation
     * @param manager Address of the manager to add
     * @param allocation Allocation amount for the manager
     */
    function addManager(address manager, uint256 allocation) external;

    /**
     * @notice Removes an existing manager
     * @param manager Address of the manager to remove
     */
    function removeManager(address manager) external;

    /**
     * @notice Updates the allocation for an existing manager
     * @param manager Address of the manager
     * @param newAllocation New allocation amount
     */
    function updateAllocation(address manager, uint256 newAllocation) external;

    /**
     * @notice Sets the RAACMinter contract address
     * @param _raacMinter Address of the new RAACMinter contract
     */
    function setRAACMinter(address _raacMinter) external;

    /**
     * @notice Deposits RAAC tokens from the liquidity pool
     * @param amount Amount of RAAC tokens to deposit
     */
    function depositRAACFromPool(uint256 amount) external;

    /**
     * @notice Pauses the contract
     */
    function pause() external;

    /**
     * @notice Unpauses the contract
     */
    function unpause() external;

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when a manager is added
     * @param manager Address of the added manager
     * @param allocation Allocation amount for the manager
     */
    event ManagerAdded(address indexed manager, uint256 allocation);

    /**
     * @notice Emitted when a manager is removed
     * @param manager Address of the removed manager
     */
    event ManagerRemoved(address indexed manager);

    /**
     * @notice Emitted when a manager's allocation is updated
     * @param manager Address of the manager
     * @param newAllocation New allocation amount
     */
    event AllocationUpdated(address indexed manager, uint256 newAllocation);

    /**
     * @notice Emitted when a user deposits tokens
     * @param user Address of the depositor
     * @param rcrvUSDAmount Amount of rToken deposited
     * @param deCRVUSDAmount Amount of deToken minted
     */
    event Deposit(address indexed user, uint256 rcrvUSDAmount, uint256 deCRVUSDAmount);

    /**
     * @notice Emitted when a user withdraws tokens
     * @param user Address of the withdrawer
     * @param rcrvUSDAmount Amount of rToken withdrawn
     * @param deCRVUSDAmount Amount of deToken burned
     * @param raacRewards Amount of RAAC rewards claimed
     */
    event Withdraw(address indexed user, uint256 rcrvUSDAmount, uint256 deCRVUSDAmount, uint256 raacRewards);

    /**
     * @notice Emitted when a borrower is liquidated
     * @param user Address of the liquidated borrower
     * @param amount Amount of debt liquidated
     */
    event BorrowerLiquidated(address indexed user, uint256 amount);

    /**
     * @notice Emitted when the liquidity pool address is set
     * @param liquidityPool Address of the new liquidity pool
     */
    event LiquidityPoolSet(address indexed liquidityPool);

    /**
     * @notice Emitted when RAAC tokens are deposited from the pool
     * @param liquidityPool Address of the liquidity pool
     * @param amount Amount of RAAC tokens deposited
     */
    event RAACDepositedFromPool(address indexed liquidityPool, uint256 amount);

    /**
     * @notice Emitted when a new market is added
     * @param market Address of the added market
     * @param allocation Initial allocation amount for the market
     */
    event MarketAdded(address indexed market, uint256 allocation);

    /**
     * @notice Emitted when a market is removed
     * @param market Address of the removed market
     */
    event MarketRemoved(address indexed market);

    /**
     * @notice Emitted when a market's allocation is updated
     * @param market Address of the market
     * @param newAllocation New allocation amount
     */
    event MarketAllocationUpdated(address indexed market, uint256 newAllocation);

    /* ========== ERRORS ========== */

    /// @notice When caller is not authorized for the operation
    error UnauthorizedAccess();

    /// @notice When amount is invalid (zero)
    error InvalidAmount();

    /// @notice When user has insufficient balance
    error InsufficientBalance();

    /// @notice When manager already exists
    error ManagerAlreadyExists();

    /// @notice When manager is not found
    error ManagerNotFound();

    /// @notice When market already exists
    error MarketAlreadyExists();

    /// @notice When market is not found
    error MarketNotFound();

    /// @notice When transfer fails
    error TransferFailed();

    /// @notice When token approval fails
    error ApprovalFailed();

    /// @notice When transfer is invalid
    error InvalidTransfer();

    /// @notice When address is invalid
    error InvalidAddress();

    /// @notice When deposit is invalid
    error InvalidDeposit();

    /// @notice When withdrawal is invalid
    error InvalidWithdraw();

    /// @notice When rewards calculation is invalid
    error InvalidRewards();
}