// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICurveCrvUSDVault
 * @notice Interface for the Curve crvUSD Vault that manages deposits and yield generation
 * @dev Implements ERC4626-style functionality with Curve-specific features
 * Key features:
 * - Deposit/withdrawal of crvUSD
 * - Yield generation through strategies
 * - Custom loss parameters
 * - Strategy management
 */
interface ICurveCrvUSDVault {
    /**
     * @notice Struct to track strategy allocation data
     * @param currentDebt Current debt allocated to strategy
     * @param totalDebt Total historical debt
     * @param lastReport Timestamp of last report
     * @param activated Whether strategy is active
     */
    struct StrategyParams {
        uint256 currentDebt;
        uint256 totalDebt;
        uint256 lastReport;
        bool activated;
    }

    /* ========== CORE FUNCTIONS ========== */

    /**
     * @notice Deposits assets into the vault
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive the shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);

    /**
     * @notice Withdraws assets from the vault
     * @param assets Amount of assets to withdraw
     * @param receiver Address to receive the assets
     * @param owner Owner of the shares
     * @param maxLoss Maximum acceptable loss in basis points
     * @param strategies Optional specific strategies to withdraw from
     * @return shares Amount of shares burned
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner,
        uint256 maxLoss,
        address[] calldata strategies
    ) external returns (uint256 shares);

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Gets the address of the underlying asset
     * @return Address of the underlying asset
     */
    function asset() external view returns (address);

    /**
     * @notice Gets the total assets managed by the vault
     * @return Total assets in underlying token
     */
    function totalAssets() external view returns (uint256);

    /**
     * @notice Gets the current price per share
     * @return Price per share in underlying decimals
     */
    function pricePerShare() external view returns (uint256);

    /**
     * @notice Gets the total idle assets not allocated to strategies
     * @return Amount of idle assets
     */
    function totalIdle() external view returns (uint256);

    /**
     * @notice Gets the total debt allocated to strategies
     * @return Total debt across all strategies
     */
    function totalDebt() external view returns (uint256);

    /**
     * @notice Checks if vault is in shutdown state
     * @return True if vault is shutdown
     */
    function isShutdown() external view returns (bool);

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when assets are deposited
     * @param sender Address initiating deposit
     * @param owner Address receiving shares
     * @param assets Amount of assets deposited
     * @param shares Amount of shares minted
     */
    event Deposit(
        address indexed sender,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    /**
     * @notice Emitted when assets are withdrawn
     * @param sender Address initiating withdrawal
     * @param receiver Address receiving assets
     * @param owner Address whose shares are burned
     * @param assets Amount of assets withdrawn
     * @param shares Amount of shares burned
     */
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    /* ========== ERRORS ========== */

    /// @notice Thrown when withdrawal amount exceeds available assets
    error InsufficientAvailableAssets();

    /// @notice Thrown when loss exceeds maximum allowed
    error MaxLossExceeded();

    /// @notice Thrown when vault is in shutdown state
    error VaultShutdown();

    /// @notice Thrown when strategy is not active
    error StrategyNotActive();

    /// @notice Thrown when deposit exceeds limits
    error DepositLimitExceeded();

    /// @notice Thrown when withdrawal exceeds limits
    error WithdrawLimitExceeded();
} 