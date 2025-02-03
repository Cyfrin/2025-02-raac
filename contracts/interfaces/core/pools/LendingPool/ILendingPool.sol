// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
    
/**
 * @title ILendingPool
 * @notice Interface for the LendingPool contract in the RAAC lending protocol.
 * @dev Defines the main functions for depositing, borrowing, repaying, and liquidating in the lending pool.
 */
interface ILendingPool is IERC721Receiver {
      // STRUCTS
    struct UserData {
        uint256 scaledDebtBalance;
        uint256[] nftTokenIds;
        mapping(uint256 => bool) depositedNFTs;
        bool underLiquidation;
        uint256 liquidationStartTime;
    }
  /**
     * @notice Deposits reserve assets into the lending pool
     * @param amount The amount to deposit
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Withdraws reserve assets from the lending pool
     * @param amount The amount to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Borrows reserve assets from the lending pool
     * @param amount The amount to borrow
     */
    function borrow(uint256 amount) external;

    /**
     * @notice Repays borrowed reserve assets
     * @param amount The amount to repay
     */
    function repay(uint256 amount) external;

    /**
     * @notice Deposits an NFT as collateral
     * @param tokenId The token ID of the NFT to deposit
     */
    function depositNFT(uint256 tokenId) external;

    /**
     * @notice Withdraws a previously deposited NFT
     * @param tokenId The token ID of the NFT to withdraw
     */
    function withdrawNFT(uint256 tokenId) external;

    /**
     * @notice Updates the state of the lending pool
     */
    function updateState() external;

    /**
     * @notice Initiates liquidation for a user
     * @param userAddress The address of the user to liquidate
     */
    function initiateLiquidation(address userAddress) external;

    /**
     * @notice Allows a user to close their liquidation by repaying debt
     */
    function closeLiquidation() external;

    /**
     * @notice Finalizes a liquidation after grace period expires
     * @param userAddress The address of the user being liquidated
     */
    function finalizeLiquidation(address userAddress) external;

    /**
     * @notice Calculates the health factor for a user
     * @param userAddress The address of the user
     * @return The user's health factor
     */
    function calculateHealthFactor(address userAddress) external view returns (uint256);

    /**
     * @notice Gets the total collateral value for a user
     * @param userAddress The address of the user
     * @return The total value of the user's collateral
     */
    function getUserCollateralValue(address userAddress) external view returns (uint256);

    /**
     * @notice Gets the total debt for a user
     * @param userAddress The address of the user
     * @return The user's total debt
     */
    function getUserDebt(address userAddress) external view returns (uint256);

    /**
     * @notice Gets the price of an NFT
     * @param tokenId The token ID of the NFT
     * @return The price of the NFT
     */
    function getNFTPrice(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Gets the normalized income of the reserve
     * @return The normalized income
     */
    function getNormalizedIncome() external view returns (uint256);

    /**
     * @notice Gets the normalized debt of the reserve
     * @return The normalized debt
     */
    function getNormalizedDebt() external view returns (uint256);

    /**
     * @notice Parameter types that can be set by owner
     */
    enum OwnerParameter {
        LiquidationThreshold,
        HealthFactorLiquidationThreshold,
        LiquidationGracePeriod,
        LiquidityBufferRatio,
        WithdrawalStatus,
        CanPaybackDebt
    }

    /**
     * @notice Sets a parameter value
     * @dev Only callable by contract owner
     * @param param The parameter to update
     * @param newValue The new value to set
     */
    function setParameter(OwnerParameter param, uint256 newValue) external;

    /**
     * @notice Sets the prime rate of the reserve
     * @param newPrimeRate The new prime rate
     */
    function setPrimeRate(uint256 newPrimeRate) external;

    /**
     * @notice Sets the protocol fee rate
     * @param newProtocolFeeRate The new protocol fee rate
     */
    function setProtocolFeeRate(uint256 newProtocolFeeRate) external;

    /**
     * @notice Sets the stability pool address
     * @param newStabilityPool The new stability pool address
     */
    function setStabilityPool(address newStabilityPool) external;

    /**
     * @notice Transfers accrued dust to a recipient
     * @param recipient The address to receive the dust
     * @param amountUnderlying The amount of underlying tokens to transfer
     */
    function transferAccruedDust(address recipient, uint256 amountUnderlying) external;

    // EVENTS
    /**
     * @notice Emitted when a user deposits assets
     * @param user The address of the user
     * @param amount The amount deposited
     * @param mintedAmount The amount of RTokens minted
     */
    event Deposit(address indexed user, uint256 amount, uint256 mintedAmount);

    /**
     * @notice Emitted when a user withdraws assets
     * @param user The address of the user
     * @param amount The amount withdrawn
     */
    event Withdraw(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a user borrows assets
     * @param user The address of the user
     * @param amount The amount borrowed
     */
    event Borrow(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a user repays borrowed assets
     * @param user The address of the user calling the repay function
     * @param onBehalfOf The address of the user being repaid on behalf of
     * @param amount The amount repaid
     */
    event Repay(address indexed user, address indexed onBehalfOf, uint256 amount);

    /**
     * @notice Emitted when a user deposits an NFT as collateral
     * @param user The address of the user
     * @param tokenId The token ID of the NFT
     */
    event NFTDeposited(address indexed user, uint256 tokenId);

    /**
     * @notice Emitted when a user withdraws an NFT
     * @param user The address of the user
     * @param tokenId The token ID of the NFT
     */
    event NFTWithdrawn(address indexed user, uint256 tokenId);

    /**
     * @notice Emitted when a liquidation occurs
     * @param liquidator The address of the liquidator
     * @param user The address of the user being liquidated
     * @param debtRepaid The amount of debt repaid
     * @param collateralLiquidated The amount of collateral liquidated
     */
    event Liquidation(address indexed liquidator, address indexed user, uint256 debtRepaid, uint256 collateralLiquidated);

    /**
     * @notice Emitted when liquidation parameters are updated
     * @param newLiquidationThreshold The new liquidation threshold
     * @param newHealthFactorLiquidationThreshold The new health factor liquidation threshold
     * @param newLiquidationGracePeriod The new liquidation grace period
     */
    event LiquidationParametersUpdated(uint256 newLiquidationThreshold, uint256 newHealthFactorLiquidationThreshold, uint256 newLiquidationGracePeriod);

    /**
     * @notice Emitted when liquidation is initiated
     * @param liquidator The address of the liquidator
     * @param user The address of the user being liquidated
     */ 
    event LiquidationInitiated(address indexed liquidator, address indexed user);

    /**
     * @notice Emitted when liquidation is closed
     * @param user The address of the user
     */
    event LiquidationClosed(address indexed user);

    /**
     * @notice Emitted when a liquidation is finalized
     * @param liquidator The address of the liquidator
     * @param user The address of the user being liquidated
     * @param debtRepaid The amount of debt repaid
     * @param collateralLiquidated The amount of collateral liquidated
     */
    event LiquidationFinalized(address indexed liquidator, address indexed user, uint256 debtRepaid, uint256 collateralLiquidated);

    /**
     * @notice Emitted when the Stability Pool address is updated
     * @param oldStabilityPool The old address of the Stability Pool
     * @param newStabilityPool The new address of the Stability Pool
     */
    event StabilityPoolUpdated(address indexed oldStabilityPool, address indexed newStabilityPool);

    /**
     * @notice Emitted when the repay on behalf status changes
     * @param enabled True if repay on behalf is enabled, false otherwise
     */
    event CanPaybackDebtChanged(bool enabled);

    /**
     * @notice Emitted when liquidity is rebalanced
     * @param bufferAmount The amount of liquidity in the buffer
     * @param vaultAmount The amount of liquidity in the Curve vault
     */
    event LiquidityRebalanced(uint256 bufferAmount, uint256 vaultAmount);

    /**
     * @notice Emitted when the Curve crvUSD vault is updated
     * @param oldVault The old address of the Curve vault
     * @param newVault The new address of the Curve vault
     */
    event CurveVaultUpdated(address indexed oldVault, address indexed newVault);

    /**
     * @notice Emitted when the liquidity buffer ratio is updated
     * @param oldRatio The old liquidity buffer ratio
     * @param newRatio The new liquidity buffer ratio
     */
    event LiquidityBufferRatioUpdated(uint256 oldRatio, uint256 newRatio);

    /**
     * @notice Emitted when withdrawal functionality is paused or unpaused
     * @param isPaused True if withdrawal functionality is paused, false otherwise
     */
    event WithdrawalsPauseStatusChanged(bool isPaused);


    // ERRORS
    error NotOwnerOfNFT();
    error NFTAlreadyDeposited();
    error NFTNotDeposited();
    error WithdrawalWouldLeaveUserUnderCollateralized();
    error NoCollateral();
    error InsufficientBalance();
    error RepayAmountTooHigh();
    error HealthFactorTooLow();
    error TransferFailed();
    error NotEnoughCollateralToBorrow();
    error DebtNotZero();
    error SameAddressNotAllowed();
    error AddressCannotBeZero();
    error InvalidInterestRateMode();
    error InvalidParameter();
    error InvalidNFTPrice();
    error Unauthorized();
    error UserAlreadyUnderLiquidation();
    error NotUnderLiquidation();
    error GracePeriodExpired();
    error GracePeriodNotExpired();
    error InvalidAmount();
    error CannotWithdrawUnderLiquidation();
    error CannotBorrowUnderLiquidation();
    error StalePrice();
    error PaybackDebtDisabled();
    error WithdrawalsArePaused();
}
