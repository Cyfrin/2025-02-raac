// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// OpenZeppelin libraries
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../../libraries/math/PercentageMath.sol";
import "../../../libraries/math/WadRayMath.sol";
import "../../../libraries/pools/ReserveLibrary.sol";
// Interface contracts
import "../../../interfaces/core/pools/LendingPool/ILendingPool.sol";
// External interfaces
import "../../../interfaces/core/oracles/IRAACHousePrices.sol";
import "../../../interfaces/core/tokens/IDebtToken.sol";
import "../../../interfaces/core/tokens/IRAACNFT.sol";
import "../../../interfaces/core/tokens/IRToken.sol";

import "../../tokens/DebtToken.sol";
import "../../tokens/RToken.sol";
// Curve's crvUSD vault interface
import "../../../interfaces/curve/ICurveCrvUSDVault.sol";

/**
 * @title LendingPool
 * @notice Main contract for the RAAC lending protocol. Users can deposit assets, borrow, repay, and more.
 * @dev This contract manages interactions with RTokens, DebtTokens, and handles the main logic for asset lending.
 */
contract LendingPool is ILendingPool, Ownable, ReentrancyGuard, ERC721Holder, Pausable {
    using Address for address payable;
    using PercentageMath for uint256;
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;

    using ReserveLibrary for ReserveLibrary.ReserveData;
    using ReserveLibrary for ReserveLibrary.ReserveRateData;

    // Reserve data, including liquidity, usage indices, and addresses
    ReserveLibrary.ReserveData public reserve;

    // Rate data, including interest rates and thresholds
    ReserveLibrary.ReserveRateData public rateData;

    // Mapping of user addresses to their data
    mapping(address => UserData) public userData;

    // Collateral NFT contract interface
    IRAACNFT public immutable raacNFT;

    // Price Oracle interface
    IRAACHousePrices public priceOracle;

    // Prime Rate Oracle
    address public primeRateOracle;

    // CrvUSD token interface
    IERC20 public reserveAssetToken;

    // RToken interface
    IRToken public rToken;

    // DebtToken interface
    IDebtToken public debtToken;

    // Stability Pool address
    address public stabilityPool;

    // Can payback debt of other users
    bool public canPaybackDebt = true;

    // Liquidation parameters
    uint256 public constant BASE_LIQUIDATION_THRESHOLD = 80 * 1e2; // 80% in basis points
    uint256 public constant BASE_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18; // Health factor threshold
    uint256 public constant BASE_LIQUIDATION_GRACE_PERIOD = 3 days;
    uint256 private constant DUST_THRESHOLD = 1e6;

    uint256 public liquidationThreshold;
    uint256 public healthFactorLiquidationThreshold;
    uint256 public liquidationGracePeriod;

    // Mapping to track users under liquidation
    mapping(address => bool) public isUnderLiquidation;
    mapping(address => uint256) public liquidationStartTime;

    // Curve crvUSD Vault interface
    ICurveCrvUSDVault public curveVault;

    // Liquidity buffer ratio (20% represented in basis points = 20_00)
    uint256 public liquidityBufferRatio = 20_00; // 20%

    // Total amount deposited in the vault
    uint256 public totalVaultDeposits;

    // Allow to pause withdrawals
    bool public withdrawalsPaused = false;

    // MODIFIERS

    modifier onlyValidAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier onlyStabilityPool() {
        if (msg.sender != stabilityPool) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyPrimeRateOracle() {
        if (msg.sender != primeRateOracle) {
            revert Unauthorized();
        }
        _;
    }

    /**
     * @notice Sets a parameter value
     * @dev Only callable by contract owner
     * @param param The parameter to update
     * @param newValue The new value to set
     */
    function setParameter(OwnerParameter param, uint256 newValue) external override onlyOwner {
        if (param == OwnerParameter.LiquidationThreshold) {
            require(newValue <= 100_00, "Invalid liquidation threshold");
            liquidationThreshold = newValue;
            emit LiquidationParametersUpdated(liquidationThreshold, healthFactorLiquidationThreshold, liquidationGracePeriod);
        }
        else if (param == OwnerParameter.HealthFactorLiquidationThreshold) {
            healthFactorLiquidationThreshold = newValue;
            emit LiquidationParametersUpdated(liquidationThreshold, healthFactorLiquidationThreshold, liquidationGracePeriod);
        } 
        else if (param == OwnerParameter.LiquidationGracePeriod) {
            require(newValue >= 1 days && newValue <= 7 days, "Invalid grace period");
            liquidationGracePeriod = newValue;
            emit LiquidationParametersUpdated(liquidationThreshold, healthFactorLiquidationThreshold, liquidationGracePeriod);
        } 
        else if (param == OwnerParameter.LiquidityBufferRatio) {
            require(newValue <= 100_00, "Ratio cannot exceed 100%");
            uint256 oldValue = liquidityBufferRatio;
            liquidityBufferRatio = newValue;
            emit LiquidityBufferRatioUpdated(oldValue, newValue);
        } 
        else if (param == OwnerParameter.WithdrawalStatus) {
            require(newValue <= 1, "Invalid boolean value");
            withdrawalsPaused = newValue == 1;
            emit WithdrawalsPauseStatusChanged(withdrawalsPaused);
        } 
        else if (param == OwnerParameter.CanPaybackDebt) {
            require(newValue <= 1, "Invalid boolean value");
            canPaybackDebt = newValue == 1;
            emit CanPaybackDebtChanged(canPaybackDebt);
        }
    }

    // CONSTRUCTOR
    /**
     * @dev Constructor
     * @param _reserveAssetAddress The address of the reserve asset (e.g., crvUSD)
     * @param _rTokenAddress The address of the RToken contract
     * @param _debtTokenAddress The address of the DebtToken contract
     * @param _raacNFTAddress The address of the RAACNFT contract
     * @param _priceOracleAddress The address of the price oracle
     * @param _initialPrimeRate The initial prime rate
     */     
    constructor(
        address _reserveAssetAddress,
        address _rTokenAddress,
        address _debtTokenAddress,
        address _raacNFTAddress,
        address _priceOracleAddress,
        uint256 _initialPrimeRate
    ) Ownable(msg.sender) {
        if (
            _reserveAssetAddress == address(0) ||
            _rTokenAddress == address(0) ||
            _debtTokenAddress == address(0) ||
            _raacNFTAddress == address(0) ||
            _priceOracleAddress == address(0) ||
            _initialPrimeRate == 0
        ) revert AddressCannotBeZero();

        reserveAssetToken = IERC20(_reserveAssetAddress);
        raacNFT = IRAACNFT(_raacNFTAddress);
        priceOracle = IRAACHousePrices(_priceOracleAddress);
        rToken = IRToken(_rTokenAddress);
        debtToken = IDebtToken(_debtTokenAddress);

        // Initialize reserve data
        reserve.liquidityIndex = uint128(WadRayMath.RAY); // 1e27
        reserve.usageIndex = uint128(WadRayMath.RAY);

        reserve.lastUpdateTimestamp = uint40(block.timestamp);

        // Addresses
        reserve.reserveRTokenAddress = address(_rTokenAddress);
        reserve.reserveAssetAddress = address(_reserveAssetAddress);
        reserve.reserveDebtTokenAddress = address(_debtTokenAddress);

        // Prime Rate
        rateData.primeRate = uint256(_initialPrimeRate);
        rateData.baseRate = rateData.primeRate.percentMul(25_00); // 25% of prime rate
        rateData.optimalRate = rateData.primeRate.percentMul(50_00); // 50% of prime rate
        rateData.maxRate = rateData.primeRate.percentMul(400_00); // 400% of prime rate
        rateData.optimalUtilizationRate = WadRayMath.RAY.percentMul(80_00); // 80% in RAY (27 decimals)
        rateData.protocolFeeRate = 0; // 0% in RAY (27 decimals)

        // Initialize liquidation parameters
        liquidationThreshold = BASE_LIQUIDATION_THRESHOLD;
        healthFactorLiquidationThreshold = BASE_HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
        liquidationGracePeriod = BASE_LIQUIDATION_GRACE_PERIOD;
    }

    // CORE FUNCTIONS

    /**
     * @notice Allows a user to deposit reserve assets and receive RTokens
     * @param amount The amount of reserve assets to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused onlyValidAmount(amount) {
        // Update the reserve state before the deposit
        ReserveLibrary.updateReserveState(reserve, rateData);

        // Perform the deposit through ReserveLibrary
        uint256 mintedAmount = ReserveLibrary.deposit(reserve, rateData, amount, msg.sender);

        // Rebalance liquidity after deposit
        _rebalanceLiquidity();

        emit Deposit(msg.sender, amount, mintedAmount);
    }

    /**
     * @notice Allows a user to withdraw reserve assets by burning RTokens
     * @param amount The amount of reserve assets to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused onlyValidAmount(amount) {
        if (withdrawalsPaused) revert WithdrawalsArePaused();

        // Update the reserve state before the withdrawal
        ReserveLibrary.updateReserveState(reserve, rateData);

        // Ensure sufficient liquidity is available
        _ensureLiquidity(amount);

        // Perform the withdrawal through ReserveLibrary
        (uint256 amountWithdrawn, uint256 amountScaled, uint256 amountUnderlying) = ReserveLibrary.withdraw(
            reserve,   // ReserveData storage
            rateData,  // ReserveRateData storage
            amount,    // Amount to withdraw
            msg.sender // Recipient
        );

        // Rebalance liquidity after withdrawal
        _rebalanceLiquidity();

        emit Withdraw(msg.sender, amountWithdrawn);
    }

    function depositNFT(uint256 tokenId) external nonReentrant whenNotPaused {
        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        if (raacNFT.ownerOf(tokenId) != msg.sender) revert NotOwnerOfNFT();

        UserData storage user = userData[msg.sender];
        if (user.depositedNFTs[tokenId]) revert NFTAlreadyDeposited();


        user.nftTokenIds.push(tokenId);
        user.depositedNFTs[tokenId] = true;

        raacNFT.safeTransferFrom(msg.sender, address(this), tokenId);


        emit NFTDeposited(msg.sender, tokenId);
    }

    /**
     * @notice Allows a user to withdraw an NFT
     * @param tokenId The token ID of the NFT to withdraw
     */
    function withdrawNFT(uint256 tokenId) external nonReentrant whenNotPaused {
        if (isUnderLiquidation[msg.sender]) revert CannotWithdrawUnderLiquidation();

        UserData storage user = userData[msg.sender];
        if (!user.depositedNFTs[tokenId]) revert NFTNotDeposited();

        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        // Check if withdrawal would leave user undercollateralized
        uint256 userDebt = user.scaledDebtBalance.rayMul(reserve.usageIndex);
        uint256 collateralValue = getUserCollateralValue(msg.sender);
        uint256 nftValue = getNFTPrice(tokenId);

        if (collateralValue - nftValue < userDebt.percentMul(liquidationThreshold)) {
            revert WithdrawalWouldLeaveUserUnderCollateralized();
        }

        // Remove NFT from user's deposited NFTs
        for (uint256 i = 0; i < user.nftTokenIds.length; i++) {
            if (user.nftTokenIds[i] == tokenId) {
                user.nftTokenIds[i] = user.nftTokenIds[user.nftTokenIds.length - 1];
                user.nftTokenIds.pop();
                break;
            }
        }
        user.depositedNFTs[tokenId] = false;

        raacNFT.safeTransferFrom(address(this), msg.sender, tokenId);

        emit NFTWithdrawn(msg.sender, tokenId);
    }

    /**
     * @notice Allows a user to borrow reserve assets using their NFT collateral
     * @param amount The amount of reserve assets to borrow
     */
    function borrow(uint256 amount) external nonReentrant whenNotPaused onlyValidAmount(amount) {
        if (isUnderLiquidation[msg.sender]) revert CannotBorrowUnderLiquidation();

        UserData storage user = userData[msg.sender];

        uint256 collateralValue = getUserCollateralValue(msg.sender);

        if (collateralValue == 0) revert NoCollateral();

        // Update reserve state before borrowing
        ReserveLibrary.updateReserveState(reserve, rateData);

        // Ensure sufficient liquidity is available
        _ensureLiquidity(amount);

        // Fetch user's total debt after borrowing
        uint256 userTotalDebt = user.scaledDebtBalance.rayMul(reserve.usageIndex) + amount;

        // Ensure the user has enough collateral to cover the new debt
        if (collateralValue < userTotalDebt.percentMul(liquidationThreshold)) {
            revert NotEnoughCollateralToBorrow();
        }

        // Update user's scaled debt balance
        uint256 scaledAmount = amount.rayDiv(reserve.usageIndex);


        // Mint DebtTokens to the user (scaled amount)
       (bool isFirstMint, uint256 amountMinted, uint256 newTotalSupply) = IDebtToken(reserve.reserveDebtTokenAddress).mint(msg.sender, msg.sender, amount, reserve.usageIndex);

        // Transfer borrowed amount to user
        IRToken(reserve.reserveRTokenAddress).transferAsset(msg.sender, amount);

        user.scaledDebtBalance += scaledAmount;
        // reserve.totalUsage += amount;
        reserve.totalUsage = newTotalSupply;

        // Update liquidity and interest rates
        ReserveLibrary.updateInterestRatesAndLiquidity(reserve, rateData, 0, amount);

        // Rebalance liquidity after borrowing
        _rebalanceLiquidity();

        emit Borrow(msg.sender, amount);
    }

     /**
     * @notice Allows a user to repay their own borrowed reserve assets
     * @param amount The amount to repay
     */
    function repay(uint256 amount) external nonReentrant whenNotPaused onlyValidAmount(amount) {
        _repay(amount, msg.sender);
    }

    /**
     * @notice Allows a user to repay borrowed reserve assets on behalf of another user
     * @param amount The amount to repay
     * @param onBehalfOf The address of the user whose debt is being repaid
     */
    function repayOnBehalf(uint256 amount, address onBehalfOf) external nonReentrant whenNotPaused onlyValidAmount(amount) {
        if (!canPaybackDebt) revert PaybackDebtDisabled();
        if (onBehalfOf == address(0)) revert AddressCannotBeZero();
        _repay(amount, onBehalfOf);
    }

    /**
     * @notice Internal function to repay borrowed reserve assets
     * @param amount The amount to repay
     * @param onBehalfOf The address of the user whose debt is being repaid. If address(0), msg.sender's debt is repaid.
     * @dev This function allows users to repay their own debt or the debt of another user.
     *      The caller (msg.sender) provides the funds for repayment in both cases.
     *      If onBehalfOf is set to address(0), the function defaults to repaying the caller's own debt.
     */
    function _repay(uint256 amount, address onBehalfOf) internal {
        if (amount == 0) revert InvalidAmount();
        if (onBehalfOf == address(0)) revert AddressCannotBeZero();

        UserData storage user = userData[onBehalfOf];

        // Update reserve state before repayment
        ReserveLibrary.updateReserveState(reserve, rateData);

        // Calculate the user's debt (for the onBehalfOf address)
        uint256 userDebt = IDebtToken(reserve.reserveDebtTokenAddress).balanceOf(onBehalfOf);
        uint256 userScaledDebt = userDebt.rayDiv(reserve.usageIndex);

        // If amount is greater than userDebt, cap it at userDebt
        uint256 actualRepayAmount = amount > userScaledDebt ? userScaledDebt : amount;

        uint256 scaledAmount = actualRepayAmount.rayDiv(reserve.usageIndex);

        // Burn DebtTokens from the user whose debt is being repaid (onBehalfOf)
        // is not actualRepayAmount because we want to allow paying extra dust and we will then cap there
        (uint256 amountScaled, uint256 newTotalSupply, uint256 amountBurned, uint256 balanceIncrease) = 
            IDebtToken(reserve.reserveDebtTokenAddress).burn(onBehalfOf, amount, reserve.usageIndex);
        
        // Transfer reserve assets from the caller (msg.sender) to the reserve
        IERC20(reserve.reserveAssetAddress).safeTransferFrom(msg.sender, reserve.reserveRTokenAddress, amountScaled);
     
        reserve.totalUsage = newTotalSupply;
        user.scaledDebtBalance -= amountBurned;
      
        // Update liquidity and interest rates
        ReserveLibrary.updateInterestRatesAndLiquidity(reserve, rateData, amountScaled, 0);

        emit Repay(msg.sender, onBehalfOf, actualRepayAmount);
    }
    
    /**
    * @notice Updates the state of the lending pool
    * @dev This function updates the reserve state, including liquidity and usage indices
    */
    function updateState() external {
        ReserveLibrary.updateReserveState(reserve, rateData);
    }

    // LIQUIDATION FUNCTIONS

    /**
     * @notice Allows anyone to initiate the liquidation process if a user's health factor is below threshold
     * @param userAddress The address of the user to liquidate
     */
    function initiateLiquidation(address userAddress) external nonReentrant whenNotPaused {
        if (isUnderLiquidation[userAddress]) revert UserAlreadyUnderLiquidation();

        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        UserData storage user = userData[userAddress];

        uint256 healthFactor = calculateHealthFactor(userAddress);

        if (healthFactor >= healthFactorLiquidationThreshold) revert HealthFactorTooLow();

        isUnderLiquidation[userAddress] = true;
        liquidationStartTime[userAddress] = block.timestamp;

        emit LiquidationInitiated(msg.sender, userAddress);
    }

    /**
     * @notice Allows a user to repay their debt and close the liquidation within the grace period
     */
    function closeLiquidation() external nonReentrant whenNotPaused {
        address userAddress = msg.sender;

        if (!isUnderLiquidation[userAddress]) revert NotUnderLiquidation();

        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        if (block.timestamp > liquidationStartTime[userAddress] + liquidationGracePeriod) {
            revert GracePeriodExpired();
        }

        UserData storage user = userData[userAddress];

        uint256 userDebt = user.scaledDebtBalance.rayMul(reserve.usageIndex);

        if (userDebt > DUST_THRESHOLD) revert DebtNotZero();

        isUnderLiquidation[userAddress] = false;
        liquidationStartTime[userAddress] = 0;

        emit LiquidationClosed(userAddress);
    }

    /**
     * @notice Allows the Stability Pool to finalize the liquidation after the grace period has expired
     * @param userAddress The address of the user being liquidated
     */
    function finalizeLiquidation(address userAddress) external nonReentrant onlyStabilityPool {
        if (!isUnderLiquidation[userAddress]) revert NotUnderLiquidation();

        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        if (block.timestamp <= liquidationStartTime[userAddress] + liquidationGracePeriod) {
            revert GracePeriodNotExpired();
        }

        UserData storage user = userData[userAddress];

        uint256 userDebt = user.scaledDebtBalance.rayMul(reserve.usageIndex);

        
        isUnderLiquidation[userAddress] = false;
        liquidationStartTime[userAddress] = 0;
         // Transfer NFTs to Stability Pool
        for (uint256 i = 0; i < user.nftTokenIds.length; i++) {
            uint256 tokenId = user.nftTokenIds[i];
            user.depositedNFTs[tokenId] = false;
            raacNFT.transferFrom(address(this), stabilityPool, tokenId);
        }
        delete user.nftTokenIds;

        // Burn DebtTokens from the user
        (uint256 amountScaled, uint256 newTotalSupply, uint256 amountBurned, uint256 balanceIncrease) = IDebtToken(reserve.reserveDebtTokenAddress).burn(userAddress, userDebt, reserve.usageIndex);

        // Transfer reserve assets from Stability Pool to cover the debt
        IERC20(reserve.reserveAssetAddress).safeTransferFrom(msg.sender, reserve.reserveRTokenAddress, amountScaled);

        // Update user's scaled debt balance
        user.scaledDebtBalance -= amountBurned;
        reserve.totalUsage = newTotalSupply;

        // Update liquidity and interest rates
        ReserveLibrary.updateInterestRatesAndLiquidity(reserve, rateData, amountScaled, 0);


        emit LiquidationFinalized(stabilityPool, userAddress, userDebt, getUserCollateralValue(userAddress));
    }

    // VIEW FUNCTIONS

    /**
     * @notice Calculates the user's health factor
     * @param userAddress The address of the user
     * @return The health factor (in RAY)
     */
    function calculateHealthFactor(address userAddress) public view returns (uint256) {
        uint256 collateralValue = getUserCollateralValue(userAddress);
        uint256 userDebt = getUserDebt(userAddress);

        if (userDebt < 1) return type(uint256).max;

        uint256 collateralThreshold = collateralValue.percentMul(liquidationThreshold);

        return (collateralThreshold * 1e18) / userDebt;
    }

    /**
     * @notice Gets the total collateral value of a user
     * @param userAddress The address of the user
     * @return The total collateral value
     */
    function getUserCollateralValue(address userAddress) public view returns (uint256) {
        UserData storage user = userData[userAddress];
        uint256 totalValue = 0;

        for (uint256 i = 0; i < user.nftTokenIds.length; i++) {
            uint256 tokenId = user.nftTokenIds[i];
            uint256 price = getNFTPrice(tokenId);
            totalValue += price;
        }

        return totalValue;
    }

    /**
     * @notice Gets the user's debt including interest
     * @param userAddress The address of the user
     * @return The user's total debt
     */
    function getUserDebt(address userAddress) public view returns (uint256) {
        UserData storage user = userData[userAddress];
        return user.scaledDebtBalance.rayMul(reserve.usageIndex);
    }

    /**
     * @notice Gets the current price of an NFT from the oracle
     * @param tokenId The token ID of the NFT
     * @return The price of the NFT
     *
     * Checks if the price is stale
     */
    function getNFTPrice(uint256 tokenId) public view returns (uint256) {
        (uint256 price, uint256 lastUpdateTimestamp) = priceOracle.getLatestPrice(tokenId);
        if (price == 0) revert InvalidNFTPrice();
        return price;
    }

    /**
     * @notice Gets the reserve's normalized income
     * @return The normalized income (liquidity index)
     */
    function getNormalizedIncome() external view returns (uint256) {
        return reserve.liquidityIndex;
    }

    /**
     * @notice Gets the reserve's normalized debt
     * @return The normalized debt (usage index)
     */
    function getNormalizedDebt() external view returns (uint256) {
        return reserve.usageIndex;
    }

    /**
     * @notice Gets the reserve's prime rate
     * @return The prime rate
     */
    function getPrimeRate() external view returns (uint256) {
        return rateData.primeRate;
    }



   
    // ADMIN FUNCTIONS

    /**
     * @notice Pauses the contract functions under `whenNotPaused`
     * @dev Only callable by the contract owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract functions under `whenNotPaused`
     * @dev Only callable by the contract owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    /**
     * @notice Sets the prime rate of the reserve
     * @param newPrimeRate The new prime rate (in RAY)
     */
    function setPrimeRate(uint256 newPrimeRate) external onlyPrimeRateOracle {
        ReserveLibrary.setPrimeRate(reserve, rateData, newPrimeRate);
    }

    /**
     * @notice Sets the address of the price oracle
     * @param newOracle The new price oracle address
     */
    function setPrimeRateOracle(address newOracle) external onlyOwner {
        primeRateOracle = newOracle;
    }

    /**
     * @notice Sets the protocol fee rate
     * @param newProtocolFeeRate The new protocol fee rate (in RAY)
     */
    function setProtocolFeeRate(uint256 newProtocolFeeRate) external onlyOwner {
        rateData.protocolFeeRate = newProtocolFeeRate;
    }


    /**
     * @notice Sets the address of the Curve crvUSD vault
     * @param newVault The address of the new Curve vault contract
     */
    function setCurveVault(address newVault) external onlyOwner {
        require(newVault != address(0), "Invalid vault address");
        address oldVault = address(curveVault);
        curveVault = ICurveCrvUSDVault(newVault);
        emit CurveVaultUpdated(oldVault, newVault);
    }

    /**
     * @notice Sets the address of the Stability Pool
     * @dev Only callable by the contract owner
     * @param newStabilityPool The address of the new Stability Pool
     */
    function setStabilityPool(address newStabilityPool) external onlyOwner {
        if (newStabilityPool == address(0)) revert AddressCannotBeZero();
        if (newStabilityPool == stabilityPool) revert SameAddressNotAllowed();
        
        address oldStabilityPool = stabilityPool;
        stabilityPool = newStabilityPool;
        
        emit StabilityPoolUpdated(oldStabilityPool, newStabilityPool);
    }
    /**
     * @notice Rescue tokens mistakenly sent to this contract
     * @dev Only callable by the contract owner
     * @param tokenAddress The address of the ERC20 token
     * @param recipient The address to send the rescued tokens to
     * @param amount The amount of tokens to rescue
     */
    function rescueToken(address tokenAddress, address recipient, uint256 amount) external onlyOwner {
        require(tokenAddress != reserve.reserveRTokenAddress, "Cannot rescue RToken");
        IERC20(tokenAddress).safeTransfer(recipient, amount);
    }

    /**
     * @notice Transfers accrued dust (small amounts of tokens) to a specified recipient
     * @dev This function can only be called by the contract owner
     * @param recipient The address to receive the accrued dust
     * @param amount The amount of dust to transfer
     */
    function transferAccruedDust(address recipient, uint256 amount) external onlyOwner {
        // update state
        ReserveLibrary.updateReserveState(reserve, rateData);

        require(recipient != address(0), "LendingPool: Recipient cannot be zero address");
        IRToken(reserve.reserveRTokenAddress).transferAccruedDust(recipient, amount);
    }

    /**
     * @notice Internal function to ensure sufficient liquidity is available for withdrawals or borrowing
     * @param amount The amount required
     */
    function _ensureLiquidity(uint256 amount) internal {
        // if curve vault is not set, do nothing
        if (address(curveVault) == address(0)) {
            return;
        }

        uint256 availableLiquidity = IERC20(reserve.reserveAssetAddress).balanceOf(reserve.reserveRTokenAddress);

        if (availableLiquidity < amount) {
            uint256 requiredAmount = amount - availableLiquidity;
            // Withdraw required amount from the Curve vault
            _withdrawFromVault(requiredAmount);
        }
    }

    /**
     * @notice Rebalances liquidity between the buffer and the Curve vault to maintain the desired buffer ratio
     */
    function _rebalanceLiquidity() internal {
        // if curve vault is not set, do nothing
        if (address(curveVault) == address(0)) {
            return;
        }

        uint256 totalDeposits = reserve.totalLiquidity; // Total liquidity in the system
        uint256 desiredBuffer = totalDeposits.percentMul(liquidityBufferRatio);
        uint256 currentBuffer = IERC20(reserve.reserveAssetAddress).balanceOf(reserve.reserveRTokenAddress);

        if (currentBuffer > desiredBuffer) {
            uint256 excess = currentBuffer - desiredBuffer;
            // Deposit excess into the Curve vault
            _depositIntoVault(excess);
        } else if (currentBuffer < desiredBuffer) {
            uint256 shortage = desiredBuffer - currentBuffer;
            // Withdraw shortage from the Curve vault
            _withdrawFromVault(shortage);
        }

        emit LiquidityRebalanced(currentBuffer, totalVaultDeposits);
    }

    /**
     * @notice Internal function to deposit liquidity into the Curve vault
     * @param amount The amount to deposit
     */
    function _depositIntoVault(uint256 amount) internal {
        IERC20(reserve.reserveAssetAddress).approve(address(curveVault), amount);
        curveVault.deposit(amount, address(this));
        totalVaultDeposits += amount;
    }

    /**
     * @notice Internal function to withdraw liquidity from the Curve vault
     * @param amount The amount to withdraw
     */
    function _withdrawFromVault(uint256 amount) internal {
        curveVault.withdraw(amount, address(this), msg.sender, 0, new address[](0));
        totalVaultDeposits -= amount;
    }
}