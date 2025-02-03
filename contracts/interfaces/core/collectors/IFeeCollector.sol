// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFeeCollector Interface
 * @notice Interface for the FeeCollector contract that manages protocol fee collection and distribution
 * @dev Defines core functionality for fee management, distribution, and reward calculations
 */
interface IFeeCollector {
    /**
     * @notice Fee distribution parameters for each fee type
     * @dev All shares are in basis points (100% = 10000)
     * @param veRAACShare Percentage share for veRAAC holders
     * @param burnShare Percentage share for token burning
     * @param repairShare Percentage share for repair fund
     * @param treasuryShare Percentage share for treasury
     */
    struct FeeType {
        uint256 veRAACShare;    // Basis points
        uint256 burnShare;      // Basis points
        uint256 repairShare;    // Basis points
        uint256 treasuryShare;  // Basis points
    }

    /**
     * @notice Tracks collected fees across different protocol activities
     * @dev Each fee type has specific distribution rules defined in FeeType
     * @param protocolFees General protocol operation fees (80% to veRAAC)
     * @param lendingFees Interest income from lending/borrowing
     * @param performanceFees Yield product fees (20% from yield)
     * @param insuranceFees NFT loan insurance fees (3% from loans)
     * @param mintRedeemFees Token operation fees
     * @param vaultFees Vault management fees
     * @param swapTaxes Trading fees (2% total: 0.5% veRAAC, 0.5% burn, 1% repair)
     * @param nftRoyalties NFT transaction fees (2% total: 0.5% veRAAC, 1% repair, 0.5% treasury)
     */
    struct CollectedFees {
        uint256 protocolFees;
        uint256 lendingFees;
        uint256 performanceFees;
        uint256 insuranceFees;
        uint256 mintRedeemFees;
        uint256 vaultFees;
        uint256 swapTaxes;
        uint256 nftRoyalties;
    }

    /**
     * @notice Core fee management functions
     */
    
    /**
     * @notice Collects fees of a specific type
     * @param amount Amount of tokens to collect
     * @param feeType Type of fee being collected (0-7)
     * @return success True if collection successful
     */
    function collectFee(uint256 amount, uint8 feeType) external returns (bool);

    /**
     * @notice Distributes collected fees according to protocol rules
     * @dev Calculates and distributes shares to veRAAC holders, burn, repair fund and treasury
     */
    function distributeCollectedFees() external;

    /**
     * @notice Claims accumulated rewards for a user
     * @param user Address of the user claiming rewards
     * @return Amount of rewards claimed
     */
    function claimRewards(address user) external returns (uint256);
    
    /**
     * @notice Administrative functions
     */
    
    /**
     * @notice Updates parameters for a specific fee type
     * @param feeType Fee type to update (0-7)
     * @param newFee New fee distribution parameters
     */
    function updateFeeType(uint8 feeType, FeeType calldata newFee) external;

    /**
     * @notice Initiates treasury address update with timelock
     * @param newTreasury Address of the new treasury
     */
    function setTreasury(address newTreasury) external;

    /**
     * @notice Initiates repair fund address update with timelock
     * @param newRepairFund Address of the new repair fund
     */
    function setRepairFund(address newRepairFund) external;

    /**
     * @notice Emergency withdrawal of tokens to treasury
     * @param token Address of token to withdraw
     */
    function emergencyWithdraw(address token) external;
    
    /**
     * @notice View functions
     */
    
    /**
     * @notice Gets pending rewards for a user
     * @param user Address of the user
     * @return Amount of pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256);

    /**
     * @notice Gets parameters for a specific fee type
     * @param feeType Fee type to query (0-7)
     * @return FeeType struct containing fee parameters
     */
    function getFeeType(uint8 feeType) external view returns (FeeType memory);

    /**
     * @notice Gets all collected fees
     * @return CollectedFees struct containing all collected fees
     */
    function getCollectedFees() external view returns (CollectedFees memory);
    
    /**
     * @notice Events
     */
    
    /**
     * @dev Emitted when fees are collected
     * @param feeType Type of fee collected (0-7)
     * @param amount Amount of tokens collected
     */
    event FeeCollected(uint8 indexed feeType, uint256 amount);

    /**
     * @dev Emitted when fees are distributed
     * @param veRAACAmount Amount distributed to veRAAC holders
     * @param burnAmount Amount of tokens burned
     * @param repairAmount Amount sent to repair fund
     * @param treasuryAmount Amount sent to treasury
     */
    event FeeDistributed(
        uint256 veRAACAmount,
        uint256 burnAmount,
        uint256 repairAmount,
        uint256 treasuryAmount
    );

    /**
     * @dev Emitted when rewards are claimed
     * @param user Address claiming rewards
     * @param amount Amount of rewards claimed
     */
    event RewardClaimed(address indexed user, uint256 amount);

    /**
     * @dev Emitted when fee type parameters are updated
     * @param feeType Updated fee type (0-7)
     * @param newFee New fee parameters
     */
    event FeeTypeUpdated(uint8 indexed feeType, FeeType newFee);

    /**
     * @dev Emitted when treasury address is updated
     * @param newTreasury New treasury address
     */
    event TreasuryUpdated(address indexed newTreasury);

    /**
     * @dev Emitted when repair fund address is updated
     * @param newRepairFund New repair fund address
     */
    event RepairFundUpdated(address indexed newRepairFund);

    /**
     * @dev Emitted during emergency token withdrawal
     * @param token Address of withdrawn token
     * @param amount Amount withdrawn
     */
    event EmergencyWithdrawal(address indexed token, uint256 amount);

    /**
     * @dev Emitted when distribution parameters are updated
     * @param feeType Updated fee type (0-7)
     * @param newParameters New distribution parameters
     */
    event DistributionParametersUpdated(uint8 indexed feeType, FeeType newParameters);
    
    /**
     * @notice Custom errors
     */
    
    /**
     * @dev When fee type is invalid (> 7)
     */
    error InvalidFeeType();
    /**
     * @dev When fee amount is zero or exceeds maximum
     */
    error InvalidFeeAmount();

    /**
     * @dev When distribution parameters don't total 100%
     */
    error UnauthorizedCaller();

    /**
     * @dev When fee distribution fails
     */
    error DistributionFailed();

    /**
     * @dev When balance is too low for operation
     */
    error InsufficientBalance();

    /**
     * @dev When contract receives an invalid address (0x0)
     */
    error InvalidAddress();
    /**
     * @dev When amount exceeds allowed maximum
     */
    error ExcessiveAmount();
    /**
     * @dev When claiming is temporarily disabled
     */
    error ClaimingDisabled();
    /**
     * @dev When contract is paused for emergency
     */
    error EmergencyPaused();
    /**
     * @dev When distribution parameters are invalid
     */
    error InvalidDistributionParams();

    /**
     * @dev When total weight is zero
     */
    error ZeroTotalWeight();

    /**
     * @dev When division by zero occurs
     */
    error DivisionByZero();
  
}