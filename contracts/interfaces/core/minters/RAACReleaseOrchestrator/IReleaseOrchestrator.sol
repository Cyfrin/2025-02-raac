// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IReleaseOrchestrator
 * @author RegnumAurumAcquisitionCorp
 * @notice Interface for managing the vesting and release of RAAC tokens
 */
interface IReleaseOrchestrator {
    /**
     * @notice Struct to track vesting schedule for each beneficiary
     */
    struct VestingSchedule {
        uint256 totalAmount;        // Total amount allocated
        uint256 releasedAmount;     // Amount already released
        uint256 startTime;          // Start time of vesting
        uint256 duration;           // Duration of vesting in seconds
        uint256 lastClaimTime;      // Last time tokens were claimed
        bool initialized;           // Whether schedule is initialized
    }

    /**
     * @notice Creates a vesting schedule for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @param category Category of the vesting schedule
     * @param amount Amount of tokens to vest
     * @param startTime Start time of vesting
     */
    function createVestingSchedule(
        address beneficiary,
        bytes32 category,
        uint256 amount,
        uint256 startTime
    ) external;

    /**
     * @notice Releases vested tokens for the caller
     */
    function release() external;

    /**
     * @notice Emergency revoke of vesting schedule
     * @param beneficiary Address of the beneficiary to revoke
     */
    function emergencyRevoke(address beneficiary) external;

    /**
     * @notice Updates category allocation
     * @param category Category to update
     * @param newAllocation New allocation amount
     */
    function updateCategoryAllocation(bytes32 category, uint256 newAllocation) external;

    /**
     * @notice Gets vesting schedule details for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return schedule The vesting schedule details
     */
    function getVestingSchedule(address beneficiary) external view returns (VestingSchedule memory schedule);

    /**
     * @notice Gets category allocation and usage details
     * @param category Category to query
     * @return allocation Total allocation for the category
     * @return used Amount already allocated from the category
     */
    function getCategoryDetails(bytes32 category) external view returns (uint256 allocation, uint256 used);

    /**
     * @notice Sets the emergency shutdown state
     * @param paused True to pause, false to unpause
     */
    function setEmergencyShutdown(bool paused) external;

    /**
     * @notice Gets the total amount allocated across all categories
     * @return total The total allocation
     */
    function getTotalAllocation() external view returns (uint256 total);

    // Events
    event VestingScheduleCreated(address indexed beneficiary, bytes32 indexed category, uint256 amount, uint256 startTime);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingScheduleRevoked(address indexed beneficiary);
    event CategoryAllocationUpdated(bytes32 indexed category, uint256 newAllocation);
    event EmergencyWithdraw(address indexed beneficiary, uint256 amount);
    event EmergencyShutdown(address indexed caller, bool paused);

    //  errors
    error InvalidAddress();
    error InvalidAmount();
    error InvalidVestingDuration();
    error VestingAlreadyInitialized();
    error NoVestingSchedule();
    error NothingToRelease();
    error TooEarlyToRelease();
    error InvalidCategory();
    error CategoryAllocationExceeded();
    error UnauthorizedCaller();
    error EmergencyPaused();
} 