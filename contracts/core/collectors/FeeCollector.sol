// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../interfaces/core/collectors/IFeeCollector.sol";
import "../../interfaces/core/tokens/IveRAACToken.sol";
import "../../interfaces/core/tokens/IRAACToken.sol";

import "../../libraries/math/TimeWeightedAverage.sol";

/**
 * @title Fee Collector Contract
 * @author RAAC Protocol Team
 * @notice Manages protocol fee collection and distribution with time-weighted rewards
 * @dev Core contract for handling all protocol fee operations
 * Key features:
 * - Fee collection from different protocol activities
 * - Time-weighted reward distribution to veRAAC holders
 * - Configurable fee splits between stakeholders
 * - Emergency controls and access role management
 */
contract FeeCollector is IFeeCollector, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IRAACToken;
    using TimeWeightedAverage for TimeWeightedAverage.Period;

    /**
     * @notice Access control roles for contract management
     * @dev Three distinct roles with specific permissions:
     * - FEE_MANAGER_ROLE: Controls fee parameters and distribution rules
     * - EMERGENCY_ROLE: Can pause contract and execute emergency functions
     * - DISTRIBUTOR_ROLE: Authorized to trigger fee distributions
     */
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    /**
     * @notice Core protocol contract references
     * @dev Immutable addresses for core token contracts and mutable treasury addresses
     * param raacToken The main RAAC token contract
     * - veRAACToken The voting escrow token contract
     * - treasury Protocol treasury for fee collection
     * - repairFund Safety fund for protocol maintenance
     * - paused Emergency pause status
     */
    IRAACToken public immutable raacToken;
    IveRAACToken public immutable veRAACToken;
    address public treasury;
    address public repairFund;

    /**
     * @notice Fee management state
     * @dev Tracks fee configurations and collected amounts
     * param feeTypes Maps fee type IDs to their distribution parameters
     * param collectedFees Current balance of collected fees by type
     * Fee types (0-7):
     * 0: Protocol Fees - General operations
     * 1: Lending Fees - Lending/borrowing activities
     * 2: Performance Fees - Yield products
     * 3: Insurance Fees - NFT loan insurance
     * 4: Mint/Redeem Fees - Token operations
     * 5: Vault Fees - Vault management
     * 6: Swap Tax - Trading operations
     * 7: NFT Royalties - NFT transactions
     */
    mapping(uint8 => FeeType) public feeTypes;
    CollectedFees public collectedFees;
    
    /**
     * @notice Distribution tracking state
     * @dev Manages reward periods and user claims
     * - distributionPeriod Current active distribution period
     * - userRewards Accumulated rewards per user
     * - totalDistributed Total tokens distributed historically
     */
    TimeWeightedAverage.Period public distributionPeriod;
    mapping(address => uint256) public userRewards;
    uint256 public totalDistributed;

    /**
     * @notice Protocol constants
     * @dev Fixed values used in calculations and validations
     * - BASIS_POINTS Percentage calculation base (10000 = 100%)
     * - TREASURY_UPDATE_DELAY Timelock period for address updates
     * - MAX_FEE_AMOUNT Maximum single fee collection (1M tokens)
     */
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant TREASURY_UPDATE_DELAY = 1 days;
    uint256 public constant MAX_FEE_AMOUNT = 1_000_000e18;

    // Internal WeightedMath Functions
    uint256 private constant PRECISION = 1e18;
    /**
     * @notice Timelock update structure
     * @dev Used for treasury and repair fund address changes
     * - newAddress Proposed new address
     * - effectiveTime Timestamp when change can be executed
     */
    struct PendingUpdate {
        address newAddress;
        uint256 effectiveTime;
    }
    
    PendingUpdate public pendingTreasury;
    PendingUpdate public pendingRepairFund;

    /**
     * @notice User claim tracking
     * @dev Maps user addresses to their last claim timestamp
     */
    mapping(address => uint256) private lastClaimTime;

    /**
     * @notice Initializes the FeeCollector contract
     * @dev Sets up initial state and grants admin roles
     * @param _raacToken RAAC token contract address
     * @param _veRAACToken veRAAC token contract address
     * @param _treasury Initial treasury address
     * @param _repairFund Initial repair fund address
     * @param _admin Initial admin address
     */
    constructor(
        address _raacToken,
        address _veRAACToken,
        address _treasury,
        address _repairFund,
        address _admin
    ) {
        if (_raacToken == address(0) || _veRAACToken == address(0) || 
            _treasury == address(0) || _repairFund == address(0) || 
            _admin == address(0)) revert InvalidAddress();
            
        raacToken = IRAACToken(_raacToken);
        veRAACToken = IveRAACToken(_veRAACToken);
        treasury = _treasury;
        repairFund = _repairFund;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);
        
        // Initialize fee types with protocol rules
        _initializeFeeTypes();
        
        // Initialize distribution period
        distributionPeriod.startTime = block.timestamp;
        distributionPeriod.endTime = block.timestamp + 7 days;
    }

    /**
     * @notice Collects fees of a specific type
     * @param amount Amount of tokens to collect
     * @param feeType Type of fee being collected
     * @return success True if collection successful
     */
    function collectFee(uint256 amount, uint8 feeType) external override nonReentrant whenNotPaused returns (bool) {
        if (amount == 0 || amount > MAX_FEE_AMOUNT) revert InvalidFeeAmount();
        if (feeType > 7) revert InvalidFeeType();
        
        // Transfer tokens from sender
        raacToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update collected fees
        _updateCollectedFees(amount, feeType);
        
        emit FeeCollected(feeType, amount);
        return true;
    }

    /**
     * @notice Distributes collected fees according to protocol rules
     * @dev Calculates shares for veRAAC holders, burn, repair fund and treasury
     */
    function distributeCollectedFees() external override nonReentrant whenNotPaused {
        if (!hasRole(DISTRIBUTOR_ROLE, msg.sender)) revert UnauthorizedCaller();
        
        uint256 totalFees = _calculateTotalFees();
        if (totalFees == 0) revert InsufficientBalance();
        
        uint256[4] memory shares = _calculateDistribution(totalFees);
        _processDistributions(totalFees, shares);
        
        delete collectedFees;
        
        emit FeeDistributed(shares[0], shares[1], shares[2], shares[3]);
    }

    /**
     * @notice Claims accumulated rewards for a user
     * @param user Address of the user claiming rewards
     * @return amount Amount of rewards claimed
     */
    function claimRewards(address user) external override nonReentrant whenNotPaused returns (uint256) {
        if (user == address(0)) revert InvalidAddress();
        
        uint256 pendingReward = _calculatePendingRewards(user);
        if (pendingReward == 0) revert InsufficientBalance();
        
        // Reset user rewards before transfer
        userRewards[user] = totalDistributed;
        
        // Transfer rewards
        raacToken.safeTransfer(user, pendingReward);
        
        emit RewardClaimed(user, pendingReward);
        return pendingReward;
    }

    /**
     * @notice Updates parameters for a specific fee type
     * @param feeType Fee type to update
     * @param newFee New fee parameters
     */
    function updateFeeType(uint8 feeType, FeeType calldata newFee) external override {
        if (!hasRole(FEE_MANAGER_ROLE, msg.sender)) revert UnauthorizedCaller();
        if (feeType > 7) revert InvalidFeeType();
        
        // Validate fee shares total to 100%
        if (newFee.veRAACShare + newFee.burnShare + newFee.repairShare + newFee.treasuryShare != BASIS_POINTS) {
            revert InvalidDistributionParams();
        }
        
        feeTypes[feeType] = newFee;
        emit FeeTypeUpdated(feeType, newFee);
    }

    /**
     * @notice Initiates treasury address update with timelock
     * @param newTreasury Address of the new treasury
     */
    function setTreasury(address newTreasury) external override {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert UnauthorizedCaller();
        if (newTreasury == address(0)) revert InvalidAddress();
        
        pendingTreasury = PendingUpdate({
            newAddress: newTreasury,
            effectiveTime: block.timestamp + TREASURY_UPDATE_DELAY
        });
        
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Initiates repair fund address update with timelock
     * @param newRepairFund Address of the new repair fund
     */
    function setRepairFund(address newRepairFund) external override {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert UnauthorizedCaller();
        if (newRepairFund == address(0)) revert InvalidAddress();
        
        pendingRepairFund = PendingUpdate({
            newAddress: newRepairFund,
            effectiveTime: block.timestamp + TREASURY_UPDATE_DELAY
        });
        
        emit RepairFundUpdated(newRepairFund);
    }

    /**
     * @notice Emergency withdrawal of tokens
     * @param token Address of token to withdraw
     */
    function emergencyWithdraw(address token) external override whenPaused {
        if (!hasRole(EMERGENCY_ROLE, msg.sender)) revert UnauthorizedCaller();
        if (token == address(0)) revert InvalidAddress();

        uint256 balance;
        if (token == address(raacToken)) {
            balance = raacToken.balanceOf(address(this));
            raacToken.safeTransfer(treasury, balance);
        } else {
            balance = IERC20(token).balanceOf(address(this));
            SafeERC20.safeTransfer(IERC20(token), treasury, balance);
        }

        emit EmergencyWithdrawal(token, balance);
    }

    /**
     * @notice Pauses the contract
     * @dev Only callable by EMERGENCY_ROLE
     */
    function pause() external {
        if (!hasRole(EMERGENCY_ROLE, msg.sender)) revert UnauthorizedCaller();
        _pause();
    }

    /**
     * @notice Unpauses the contract
     * @dev Only callable by EMERGENCY_ROLE
     */
    function unpause() external {
        if (!hasRole(EMERGENCY_ROLE, msg.sender)) revert UnauthorizedCaller();
        _unpause();
    }

    /**
     * @notice Applies pending treasury update after timelock
     */
    function applyTreasuryUpdate() external {
        if (pendingTreasury.newAddress == address(0)) revert InvalidAddress();
        if (block.timestamp < pendingTreasury.effectiveTime) revert UnauthorizedCaller();
        
        treasury = pendingTreasury.newAddress;
        delete pendingTreasury;
    }

    /**
     * @notice Applies pending repair fund update after timelock
     */
    function applyRepairFundUpdate() external {
        if (pendingRepairFund.newAddress == address(0)) revert InvalidAddress();
        if (block.timestamp < pendingRepairFund.effectiveTime) revert UnauthorizedCaller();
        
        repairFund = pendingRepairFund.newAddress;
        delete pendingRepairFund;
    }

    // Internal calculation functions

    /**
     * @dev Initializes default fee types according to protocol rules
     */
    function _initializeFeeTypes() internal {
        // Protocol Fees: 80% to veRAAC holders, 20% to treasury
        feeTypes[0] = FeeType({
            veRAACShare: 8000,    // 80%
            burnShare: 0,
            repairShare: 0,
            treasuryShare: 2000   // 20%
        });
        
        // Lending Fees: Interest income distribution
        feeTypes[1] = FeeType({
            veRAACShare: 7000,    // 70%
            burnShare: 0,
            repairShare: 0,
            treasuryShare: 3000   // 30%
        });
        
        // Performance Fees: 20% from yield products
        feeTypes[2] = FeeType({
            veRAACShare: 6000,    // 60%
            burnShare: 0,
            repairShare: 0,
            treasuryShare: 4000   // 40%
        });
        
        // Insurance Fees: 3% from NFT loans
        feeTypes[3] = FeeType({
            veRAACShare: 5000,    // 50%
            burnShare: 0,
            repairShare: 2000,    // 20%
            treasuryShare: 3000   // 30%
        });
        
        // Mint/Redeem Fees
        feeTypes[4] = FeeType({
            veRAACShare: 6000,    // 60%
            burnShare: 0,
            repairShare: 2000,    // 20%
            treasuryShare: 2000   // 20%
        });
        
        // Vault Fees
        feeTypes[5] = FeeType({
            veRAACShare: 7000,    // 70%
            burnShare: 0,
            repairShare: 0,
            treasuryShare: 3000   // 30%
        });
        
        // Buy/Sell Swap Tax (2% total)
        feeTypes[6] = FeeType({
            veRAACShare: 500,     // 0.5%
            burnShare: 500,       // 0.5%
            repairShare: 1000,    // 1.0%
            treasuryShare: 0
        });
        
        // NFT Royalty Fees (2% total)
        feeTypes[7] = FeeType({
            veRAACShare: 500,     // 0.5%
            burnShare: 0,
            repairShare: 1000,    // 1.0%
            treasuryShare: 500    // 0.5%
        });
    }

    /**
     * @dev Processes the distribution of collected fees
     * @param totalFees Total fees to distribute
     * @param shares Distribution shares for different stakeholders
     */
    function _processDistributions(uint256 totalFees, uint256[4] memory shares) internal {
        uint256 contractBalance = raacToken.balanceOf(address(this));
        if (contractBalance < totalFees) revert InsufficientBalance();

        if (shares[0] > 0) {
            uint256 totalVeRAACSupply = veRAACToken.getTotalVotingPower();
            if (totalVeRAACSupply > 0) {
                TimeWeightedAverage.createPeriod(
                    distributionPeriod,
                    block.timestamp + 1,
                    7 days,
                    shares[0],
                    totalVeRAACSupply
                );
                totalDistributed += shares[0];
            } else {
                shares[3] += shares[0]; // Add to treasury if no veRAAC holders
            }
        }

        if (shares[1] > 0) raacToken.burn(shares[1]);
        if (shares[2] > 0) raacToken.safeTransfer(repairFund, shares[2]);
        if (shares[3] > 0) raacToken.safeTransfer(treasury, shares[3]);
    }

    /**
     * @dev Calculates distribution shares for different stakeholders
     * @param totalFees Total fees to distribute
     * @return shares Distribution shares for different stakeholders
     */
    function _calculateDistribution(uint256 totalFees) internal view returns (uint256[4] memory shares) {
        uint256 totalCollected;

        for (uint8 i = 0; i < 8; i++) {
            uint256 feeAmount = _getFeeAmountByType(i);
            if (feeAmount == 0) continue;

            FeeType memory feeType = feeTypes[i];
            totalCollected += feeAmount;
            
            uint256 weight = (feeAmount * BASIS_POINTS) / totalFees;
            shares[0] += (weight * feeType.veRAACShare) / BASIS_POINTS;
            shares[1] += (weight * feeType.burnShare) / BASIS_POINTS;
            shares[2] += (weight * feeType.repairShare) / BASIS_POINTS;
            shares[3] += (weight * feeType.treasuryShare) / BASIS_POINTS;
        }

        if (totalCollected != totalFees) revert InvalidFeeAmount();

        shares[0] = (totalFees * shares[0]) / BASIS_POINTS;
        shares[1] = (totalFees * shares[1]) / BASIS_POINTS;
        shares[2] = (totalFees * shares[2]) / BASIS_POINTS;
        shares[3] = (totalFees * shares[3]) / BASIS_POINTS;

        uint256 remainder = totalFees - (shares[0] + shares[1] + shares[2] + shares[3]);
        if (remainder > 0) shares[3] += remainder;
    }

    /**
     * @dev Calculates total fees collected across all fee types
     * @return total Total fees collected
     */
    function _calculateTotalFees() internal view returns (uint256) {
        return collectedFees.protocolFees +
               collectedFees.lendingFees +
               collectedFees.performanceFees +
               collectedFees.insuranceFees +
               collectedFees.mintRedeemFees +
               collectedFees.vaultFees +
               collectedFees.swapTaxes +
               collectedFees.nftRoyalties;
    }

    /**
     * @dev Calculates pending rewards for a user using time-weighted average
     * @param user Address of the user
     * @return pendingAmount Amount of pending rewards
     */
    function _calculatePendingRewards(address user) internal view returns (uint256) {
        uint256 userVotingPower = veRAACToken.getVotingPower(user);
        if (userVotingPower == 0) return 0;

        uint256 totalVotingPower = veRAACToken.getTotalVotingPower();
        if (totalVotingPower == 0) return 0;
        
        uint256 share = (totalDistributed * userVotingPower) / totalVotingPower;
        return share > userRewards[user] ? share - userRewards[user] : 0;
    }

    // Add these internal functions before the view functions

    /**
     * @dev Updates the collected fees for a specific fee type
     * @param amount Amount of fees collected
     * @param feeType Type of fee being collected
     */
    function _updateCollectedFees(uint256 amount, uint8 feeType) internal {
        if (feeType == 0) collectedFees.protocolFees += amount;
        else if (feeType == 1) collectedFees.lendingFees += amount;
        else if (feeType == 2) collectedFees.performanceFees += amount;
        else if (feeType == 3) collectedFees.insuranceFees += amount;
        else if (feeType == 4) collectedFees.mintRedeemFees += amount;
        else if (feeType == 5) collectedFees.vaultFees += amount;
        else if (feeType == 6) collectedFees.swapTaxes += amount;
        else if (feeType == 7) collectedFees.nftRoyalties += amount;
    }

    /**
     * @dev Gets fee amount for a specific fee type
     * @param feeType Type of fee
     * @return feeAmount Amount of fee collected
     */
    function _getFeeAmountByType(uint8 feeType) internal view returns (uint256) {
        if (feeType == 0) return collectedFees.protocolFees;
        if (feeType == 1) return collectedFees.lendingFees;
        if (feeType == 2) return collectedFees.performanceFees;
        if (feeType == 3) return collectedFees.insuranceFees;
        if (feeType == 4) return collectedFees.mintRedeemFees;
        if (feeType == 5) return collectedFees.vaultFees;
        if (feeType == 6) return collectedFees.swapTaxes;
        if (feeType == 7) return collectedFees.nftRoyalties;
        return 0;
    }

    // View Functions

    /**
     * @notice Gets pending rewards for a user
     * @param user Address of the user
     * @return Amount of pending rewards
     */
    function getPendingRewards(address user) external view override returns (uint256) {
        if (user == address(0)) revert InvalidAddress();
        return _calculatePendingRewards(user);
    }

    /**
     * @notice Gets parameters for a specific fee type
     * @param feeType Fee type to query
     * @return FeeType struct containing fee parameters
     */
    function getFeeType(uint8 feeType) external view override returns (FeeType memory) {
        if (feeType > 7) revert InvalidFeeType();
        return feeTypes[feeType];
    }

    /**
     * @notice Gets all collected fees
     * @return CollectedFees struct containing all collected fees
     */
    function getCollectedFees() external view override returns (CollectedFees memory) {
        return collectedFees;
    }

    function _updateLastClaimTime(address user) internal {
        lastClaimTime[user] = block.timestamp;
    }
}