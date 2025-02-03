// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRAACMinter
 * @author RegnumAurumAcquisitionCorp
 * @notice Interface for managing the minting and emission of RAAC tokens
 * @dev Controls token emission rates, minting rewards, and protocol parameters
 */
interface IRAACMinter {
    /* ========== CORE FUNCTIONS ========== */

    /**
     * @notice Mints RAAC rewards to a specified address
     * @param to Address to receive the minted RAAC tokens
     * @param amount Amount of RAAC tokens to mint
     */
    function mintRewards(address to, uint256 amount) external;

    /**
     * @notice Triggers the minting process and updates emission rate if interval has passed
     */
    function tick() external;

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Gets the current emission rate
     * @return The current emission rate in RAAC per block
     */
    function getEmissionRate() external view returns (uint256);

    /**
     * @notice Gets the total supply of RAAC tokens
     * @return The total supply of RAAC tokens
     */
    function getTotalSupply() external view returns (uint256);

    /**
     * @notice Gets the current amount of excess tokens held for future distribution
     * @return The amount of excess tokens
     */
    function getExcessTokens() external view returns (uint256);

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Updates the emission rate based on the dynamic emissions schedule
     */
    function updateEmissionRate() external;

    /**
     * @notice Sets the StabilityPool contract address
     * @param _stabilityPool New address of the StabilityPool contract
     */
    function setStabilityPool(address _stabilityPool) external;

    /**
     * @notice Sets the LendingPool contract address
     * @param _lendingPool New address of the LendingPool contract
     */
    function setLendingPool(address _lendingPool) external;

    /**
     * @notice Sets the swap tax rate for RAAC token
     * @param _swapTaxRate New swap tax rate (max 1000)
     */
    function setSwapTaxRate(uint256 _swapTaxRate) external;

    /**
     * @notice Sets the burn tax rate for RAAC token
     * @param _burnTaxRate New burn tax rate (max 1000)
     */
    function setBurnTaxRate(uint256 _burnTaxRate) external;

    /**
     * @notice Sets the fee collector address
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external;

    /**
     * @notice Updates the benchmark rate for emissions
     * @param _newRate New benchmark rate
     */
    function updateBenchmarkRate(uint256 _newRate) external;

    /* ========== EMERGENCY FUNCTIONS ========== */

    /**
     * @notice Emergency shutdown of the minting system
     * @param updateLastBlock If true, updates the lastUpdateBlock
     * @param newLastUpdateBlock New value for lastUpdateBlock, if 0 current block number is used
     */
    function emergencyShutdown(bool updateLastBlock, uint256 newLastUpdateBlock) external;

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when a system parameter is updated
     * @param parameter Name of the updated parameter
     * @param newValue New value of the parameter
     */
    event ParameterUpdated(string indexed parameter, uint256 newValue);

    /**
     * @notice Emitted when emission rate is updated
     * @param newRate New emission rate
     */
    event EmissionRateUpdated(uint256 newRate);

    /**
     * @notice Emitted when RAAC tokens are minted
     * @param amount Amount of tokens minted
     */
    event RAACMinted(uint256 amount);

    /**
     * @notice Emitted during emergency shutdown
     * @param initiator Address that initiated the shutdown
     * @param lastUpdateBlock Block number of last update
     */
    event EmergencyShutdown(address indexed initiator, uint256 lastUpdateBlock);

    /**
     * @notice Emitted when last update block is set
     * @param newLastUpdateBlock New last update block number
     */
    event LastUpdateBlockSet(uint256 newLastUpdateBlock);

    /**
     * @notice Emitted when RAAC token ownership transfer is initiated
     * @param newOwner Address of proposed new owner
     * @param effectiveTime Timestamp when transfer becomes effective
     */
    event RAACTokenOwnershipTransferInitiated(address indexed newOwner, uint256 effectiveTime);

    /**
     * @notice Emitted when RAAC token ownership is transferred
     * @param newOwner Address of new owner
     */
    event RAACTokenOwnershipTransferred(address indexed newOwner);

    /**
     * @notice Emitted when benchmark rate is updated
     * @param oldRate Previous benchmark rate
     * @param newRate New benchmark rate
     */
    event BenchmarkRateUpdated(uint256 oldRate, uint256 newRate);

    /**
     * @notice Emitted when minimum emission rate is updated
     * @param oldRate Previous minimum rate
     * @param newRate New minimum rate
     */
    event MinEmissionRateUpdated(uint256 oldRate, uint256 newRate);

    /**
     * @notice Emitted when maximum emission rate is updated
     * @param oldRate Previous maximum rate
     * @param newRate New maximum rate
     */
    event MaxEmissionRateUpdated(uint256 oldRate, uint256 newRate);

    /**
     * @notice Emitted when adjustment factor is updated
     * @param oldFactor Previous adjustment factor
     * @param newFactor New adjustment factor
     */
    event AdjustmentFactorUpdated(uint256 oldFactor, uint256 newFactor);

    /**
     * @notice Emitted when utilization target is updated
     * @param oldTarget Previous utilization target
     * @param newTarget New utilization target
     */
    event UtilizationTargetUpdated(uint256 oldTarget, uint256 newTarget);

    /**
     * @notice Emitted when emission update interval is updated
     * @param oldInterval Previous update interval
     * @param newInterval New update interval
     */
    event EmissionUpdateIntervalUpdated(uint256 oldInterval, uint256 newInterval);

    /* ========== ERRORS ========== */

    /// @notice When caller is not StabilityPool
    error OnlyStabilityPool();

    /// @notice When emission update is attempted too frequently
    error EmissionUpdateTooFrequent();

    /// @notice When parameter update value is invalid
    error InvalidParameter();

    /// @notice When swap tax rate exceeds maximum allowed value
    error SwapTaxRateExceedsLimit();

    /// @notice When burn tax rate exceeds maximum allowed value
    error BurnTaxRateExceedsLimit();

    /// @notice When fee collector address is zero
    error FeeCollectorCannotBeZeroAddress();

    /// @notice When zero address is provided where not allowed
    error ZeroAddress();

    /// @notice When invalid block number is provided
    error InvalidBlockNumber();

    /// @notice When ownership transfer is not due yet
    error OwnershipTransferNotDue();

    /// @notice When no ownership transfer is pending
    error NoOwnershipTransferPending();

    /// @notice When ownership transfer window has expired
    error OwnershipTransferExpired();

    /// @notice When benchmark rate is invalid
    error InvalidBenchmarkRate();

    /// @notice When minimum emission rate is invalid
    error InvalidMinEmissionRate();

    /// @notice When maximum emission rate is invalid
    error InvalidMaxEmissionRate();

    /// @notice When adjustment factor is invalid
    error InvalidAdjustmentFactor();

    /// @notice When utilization target is invalid
    error InvalidUtilizationTarget();

    /// @notice When emission update interval is invalid
    error InvalidEmissionUpdateInterval();
}