// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../../interfaces/core/tokens/IRAACToken.sol";
import "../../../interfaces/core/minters/RAACReleaseOrchestrator/IReleaseOrchestrator.sol";

/**
 * @title RAACReleaseOrchestrator
 * @author RegnumAurumAcquisitionCorp
 * @notice Manages the vesting and release of RAAC tokens for various stakeholders
 * @dev Implements vesting schedules for initial token distribution (65% of total supply)
 *      Handles different vesting schedules for team, advisors, treasury, etc.
 *      Ensures daily linear release over specified periods
 */
contract RAACReleaseOrchestrator is IReleaseOrchestrator, ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IRAACToken;

    /// @notice Core state variables
    IRAACToken public immutable raacToken;
    
    /// @notice Vesting schedule mappings
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(bytes32 => uint256) public categoryAllocations;
    mapping(bytes32 => uint256) public categoryUsed;
    
    /// @notice Category identifiers
    bytes32 public constant TEAM_CATEGORY = keccak256("TEAM");
    bytes32 public constant ADVISOR_CATEGORY = keccak256("ADVISOR");
    bytes32 public constant TREASURY_CATEGORY = keccak256("TREASURY");
    bytes32 public constant PRIVATE_SALE_CATEGORY = keccak256("PRIVATE_SALE");
    bytes32 public constant PUBLIC_SALE_CATEGORY = keccak256("PUBLIC_SALE");
    bytes32 public constant LIQUIDITY_CATEGORY = keccak256("LIQUIDITY");
    
    /// @notice Role identifiers
    bytes32 public constant ORCHESTRATOR_ROLE = keccak256("ORCHESTRATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Time constants
    uint256 public constant VESTING_CLIFF = 90 days;
    uint256 public constant VESTING_DURATION = 700 days;
    uint256 public constant MIN_RELEASE_INTERVAL = 1 days;
    uint256 public constant GRACE_PERIOD = 7 days;

    /**
     * @notice Initializes the RAACReleaseOrchestrator contract
     * @param _raacToken Address of the RAAC token
     */
    constructor(address _raacToken) {
        if (_raacToken == address(0)) revert InvalidAddress();
        raacToken = IRAACToken(_raacToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORCHESTRATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        // Initialize category allocations
        categoryAllocations[TEAM_CATEGORY] = 18_000_000 ether;        // 18%
        categoryAllocations[ADVISOR_CATEGORY] = 10_300_000 ether;     // 10.3%
        categoryAllocations[TREASURY_CATEGORY] = 5_000_000 ether;     // 5%
        categoryAllocations[PRIVATE_SALE_CATEGORY] = 10_000_000 ether;// 10%
        categoryAllocations[PUBLIC_SALE_CATEGORY] = 15_000_000 ether; // 15%
        categoryAllocations[LIQUIDITY_CATEGORY] = 6_800_000 ether;    // 6.8% (5.8% + 1%)
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
    ) external onlyRole(ORCHESTRATOR_ROLE) whenNotPaused {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (vestingSchedules[beneficiary].initialized) revert VestingAlreadyInitialized();
        if (categoryAllocations[category] == 0) revert InvalidCategory();
        
        // Check category allocation limits
        uint256 newCategoryTotal = categoryUsed[category] + amount;
        if (newCategoryTotal > categoryAllocations[category]) revert CategoryAllocationExceeded();
        categoryUsed[category] = newCategoryTotal;
        
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        schedule.totalAmount = amount;
        schedule.startTime = startTime;
        schedule.duration = VESTING_DURATION;
        schedule.initialized = true;
        
        emit VestingScheduleCreated(beneficiary, category, amount, startTime);
    }

    /**
     * @notice Releases vested tokens for the caller
     */
    function release() external nonReentrant whenNotPaused {
        address beneficiary = msg.sender;
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        if (!schedule.initialized) revert NoVestingSchedule();
        
        uint256 releasableAmount = _calculateReleasableAmount(schedule);
        if (releasableAmount == 0) revert NothingToRelease();
        
        schedule.releasedAmount += releasableAmount;
        schedule.lastClaimTime = block.timestamp;
        
        raacToken.transfer(beneficiary, releasableAmount);
        emit TokensReleased(beneficiary, releasableAmount);
    }

    /**
     * @notice Emergency revoke of vesting schedule
     * @param beneficiary Address of the beneficiary to revoke
     * @dev Only callable by EMERGENCY_ROLE - Do we really want to allow this in the first place, would need more move too ?
     */
    function emergencyRevoke(address beneficiary) external onlyRole(EMERGENCY_ROLE) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (!schedule.initialized) revert NoVestingSchedule();
        
        uint256 unreleasedAmount = schedule.totalAmount - schedule.releasedAmount;
        delete vestingSchedules[beneficiary];
        
        if (unreleasedAmount > 0) {
            raacToken.transfer(address(this), unreleasedAmount);
            emit EmergencyWithdraw(beneficiary, unreleasedAmount);
        }
        
        emit VestingScheduleRevoked(beneficiary);
    }

    /**
     * @notice Updates category allocation
     * @param category Category to update
     * @param newAllocation New allocation amount
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     */
    function updateCategoryAllocation(
        bytes32 category,
        uint256 newAllocation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (categoryAllocations[category] == 0) revert InvalidCategory();
        if (newAllocation < categoryUsed[category]) revert InvalidAmount();
        
        categoryAllocations[category] = newAllocation;
        emit CategoryAllocationUpdated(category, newAllocation);
    }

    /**
     * @notice Gets vesting schedule details for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return schedule The vesting schedule details
     */
    function getVestingSchedule(
        address beneficiary
    ) external view returns (VestingSchedule memory schedule) {
        return vestingSchedules[beneficiary];
    }

    /**
     * @notice Gets category allocation and usage details
     * @param category Category to query
     * @return allocation Total allocation for the category
     * @return used Amount already allocated from the category
     */
    function getCategoryDetails(
        bytes32 category
    ) external view returns (uint256 allocation, uint256 used) {
        return (categoryAllocations[category], categoryUsed[category]);
    }

    /**
     * @notice Calculates releasable amount for a vesting schedule
     * @param schedule The vesting schedule to calculate for
     * @return The amount of tokens that can be released
     */
    function _calculateReleasableAmount(
        VestingSchedule memory schedule
    ) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime + VESTING_CLIFF) return 0;
        if (block.timestamp < schedule.lastClaimTime + MIN_RELEASE_INTERVAL) return 0;
        
        uint256 timeFromStart = block.timestamp - schedule.startTime;
        if (timeFromStart >= schedule.duration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }
        
        uint256 vestedAmount = (schedule.totalAmount * timeFromStart) / schedule.duration;
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @notice Sets the emergency shutdown state
     * @param paused True to pause, false to unpause
     */
    function setEmergencyShutdown(bool paused) external onlyRole(EMERGENCY_ROLE) {
        paused ? _pause() : _unpause();
        emit EmergencyShutdown(msg.sender, paused);
    }

    /**
     * @notice Gets the total amount allocated across all categories
     * @return total The total allocation
     */
    function getTotalAllocation() external view returns (uint256 total) {
        return categoryAllocations[TEAM_CATEGORY] +
               categoryAllocations[ADVISOR_CATEGORY] +
               categoryAllocations[TREASURY_CATEGORY] +
               categoryAllocations[PRIVATE_SALE_CATEGORY] +
               categoryAllocations[PUBLIC_SALE_CATEGORY] +
               categoryAllocations[LIQUIDITY_CATEGORY];
    }
}