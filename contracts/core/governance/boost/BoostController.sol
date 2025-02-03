// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../../interfaces/core/governance/IBoostController.sol";
import "../../../interfaces/core/tokens/IveRAACToken.sol";

import "../../../libraries/governance/BoostCalculator.sol";

/**
 * @title BoostController
 * @author RegnumAurumAcquisitionCorp
 * @notice Manages boost calculations and delegations for the RAAC protocol
 * @dev Implements Curve-style boost mechanics with max 2.5x multiplier
 *      Handles boost delegations, calculations, and pool management
 */
contract BoostController is IBoostController, ReentrancyGuard, AccessControl, Pausable {
    using BoostCalculator for BoostCalculator.BoostState;

    // State variables
    BoostCalculator.BoostState private boostState;
    IveRAACToken public immutable veToken;
    
    /// @notice Maps user addresses to their boost information for each pool
    mapping(address => mapping(address => UserBoost)) private userBoosts; // user => pool => boost
    /// @notice Maps pool addresses to their boost information
    mapping(address => PoolBoost) private poolBoosts; // pool => boost
    /// @notice Tracks which pools are supported by the boost system
    mapping(address => bool) public supportedPools;
    
    /// @notice Role identifier for manager functions
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    /// @notice Role identifier for emergency admin functions
    bytes32 public constant EMERGENCY_ADMIN = keccak256("EMERGENCY_ADMIN");
    /// @notice Maximum boost multiplier (2.5x) in basis points
    uint256 public constant MAX_BOOST = 25000;
    /// @notice Minimum boost multiplier (1x) in basis points
    uint256 public constant MIN_BOOST = 10000;
    /// @notice Minimum duration for boost delegation
    uint256 public constant MIN_DELEGATION_DURATION = 7 days;
    /// @notice Maximum duration for boost delegation
    uint256 public constant MAX_DELEGATION_DURATION = 365 days;
    
    /**
     * @notice Initializes the BoostController contract
     * @param _veToken Address of the veToken contract
     */
    constructor(address _veToken) {
        if (_veToken == address(0)) revert InvalidPool();
        veToken = IveRAACToken(_veToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ADMIN, msg.sender);
        
        boostState.maxBoost = MAX_BOOST;
        boostState.minBoost = MIN_BOOST;
        boostState.boostWindow = 7 days;
    }

    /**
     * @notice Modifies the supported status of a pool
     * @param pool Address of the pool to modify
     * @param isSupported Whether the pool should be supported
     * @dev Only callable by accounts with MANAGER_ROLE
     */
    function modifySupportedPool(address pool, bool isSupported) external onlyRole(MANAGER_ROLE) {
        if (pool == address(0)) revert InvalidPool();
        if (supportedPools[pool] == isSupported) revert PoolNotSupported();
        supportedPools[pool] = isSupported;
        if (isSupported) {
            emit PoolAdded(pool);
        } else {
            emit PoolRemoved(pool);
        }
    }
    /**
     * @notice Internal function to calculate boost for a user
     * @param user Address of the user
     * @param pool Address of the pool
     * @param amount Base amount to calculate boost for
     * @return Calculated boost amount
     */
    function _calculateBoost(
        address user,
        address pool,
        uint256 amount
    ) internal view returns (uint256) {
        if (amount == 0) revert InvalidBoostAmount();
        if (!supportedPools[pool]) revert PoolNotSupported();
        
        // Get current weights without modifying state
        (uint256 totalWeight, uint256 totalVotingPower, uint256 votingPower) = updateTotalWeight();
        
        uint256 userBalance = IERC20(address(veToken)).balanceOf(user);
        uint256 totalSupply = IERC20(address(veToken)).totalSupply();
        
        if (userBalance == 0 || totalSupply == 0) {
            return amount;
        }
        
        // Create parameters struct for calculation
        BoostCalculator.BoostParameters memory params = BoostCalculator.BoostParameters({
            maxBoost: boostState.maxBoost,
            minBoost: boostState.minBoost,
            boostWindow: boostState.boostWindow,
            totalWeight: totalWeight,
            totalVotingPower: totalVotingPower,
            votingPower: votingPower
        });
        
        (uint256 boostBasisPoints, uint256 boostedAmount) = BoostCalculator.calculateTimeWeightedBoost(
            params,
            userBalance,
            totalSupply,
            amount
        );

        if (boostedAmount < amount) {
            return amount;
        }
        uint256 maxBoostAmount = amount * MAX_BOOST / 10000;
        if (boostedAmount > maxBoostAmount) {
            return maxBoostAmount;
        }
        return boostedAmount;
    }
    
    /**
     * @notice External function to calculate boost for a user
     * @param user Address of the user
     * @param pool Address of the pool
     * @param amount Base amount to calculate boost for
     * @return boostBasisPoints The calculated boost multiplier in basis points
     * @return boostedAmount The calculated boosted amount
     */
    function calculateBoost(
        address user,
        address pool,
        uint256 amount
    ) external view override returns (uint256 boostBasisPoints, uint256 boostedAmount) {
        if (!supportedPools[pool]) revert UnsupportedPool();
        
        // Get current weights without modifying state
        (uint256 totalWeight, uint256 totalVotingPower, uint256 votingPower) = updateTotalWeight();
        
        uint256 userVotingPower = veToken.getVotingPower(user, block.timestamp);
        
        // Create parameters struct for calculation
        BoostCalculator.BoostParameters memory params = BoostCalculator.BoostParameters({
            maxBoost: boostState.maxBoost,
            minBoost: boostState.minBoost,
            boostWindow: boostState.boostWindow,
            totalWeight: totalWeight,
            totalVotingPower: totalVotingPower,
            votingPower: votingPower
        });
        
        return BoostCalculator.calculateTimeWeightedBoost(
            params,
            userVotingPower,
            totalVotingPower,
            amount
        );
    }
    
    /**
     * @notice Updates the boost value for a user in a specific pool
     * @param user Address of the user whose boost is being updated
     * @param pool Address of the pool for which to update the boost
     * @dev Calculates new boost based on current veToken balance and updates pool totals
     */
    function updateUserBoost(address user, address pool) external override nonReentrant whenNotPaused {
        if (paused()) revert EmergencyPaused();
        if (user == address(0)) revert InvalidPool();
        if (!supportedPools[pool]) revert PoolNotSupported();
        
        UserBoost storage userBoost = userBoosts[user][pool];
        PoolBoost storage poolBoost = poolBoosts[pool];
        
        uint256 oldBoost = userBoost.amount;
        // Calculate new boost based on current veToken balance
        uint256 newBoost = _calculateBoost(user, pool, 10000); // Base amount
        
        userBoost.amount = newBoost;
        userBoost.lastUpdateTime = block.timestamp;
        
        // Update pool totals safely
        if (newBoost >= oldBoost) {
            poolBoost.totalBoost = poolBoost.totalBoost + (newBoost - oldBoost);
        } else {
            poolBoost.totalBoost = poolBoost.totalBoost - (oldBoost - newBoost);
        }
        poolBoost.workingSupply = newBoost; // Set working supply directly to new boost
        poolBoost.lastUpdateTime = block.timestamp;
        
        emit BoostUpdated(user, pool, newBoost);
        emit PoolBoostUpdated(pool, poolBoost.totalBoost, poolBoost.workingSupply);
    }
    
    /**
     * @notice Delegates boost from caller to another address
     * @param to Address to delegate boost to
     * @param amount Amount of boost to delegate
     * @param duration Duration of the delegation in seconds
     * @dev Requires sufficient veToken balance and no existing delegation
     */
    function delegateBoost(
        address to,
        uint256 amount,
        uint256 duration
    ) external override nonReentrant {
        if (paused()) revert EmergencyPaused();
        if (to == address(0)) revert InvalidPool();
        if (amount == 0) revert InvalidBoostAmount();
        if (duration < MIN_DELEGATION_DURATION || duration > MAX_DELEGATION_DURATION) 
            revert InvalidDelegationDuration();
        
        uint256 userBalance = IERC20(address(veToken)).balanceOf(msg.sender);
        if (userBalance < amount) revert InsufficientVeBalance();
        
        UserBoost storage delegation = userBoosts[msg.sender][to];
        if (delegation.amount > 0) revert BoostAlreadyDelegated();
        
        delegation.amount = amount;
        delegation.expiry = block.timestamp + duration;
        delegation.delegatedTo = to;
        delegation.lastUpdateTime = block.timestamp;
        
        emit BoostDelegated(msg.sender, to, amount, duration);
    }
    
    /**
     * @notice Removes an expired boost delegation
     * @param from Address that delegated the boost
     * @dev Can only be called by the delegation recipient after expiry
     */
    function removeBoostDelegation(address from) external override nonReentrant {
        UserBoost storage delegation = userBoosts[from][msg.sender];
        if (delegation.delegatedTo != msg.sender) revert DelegationNotFound();
        if (delegation.expiry > block.timestamp) revert InvalidDelegationDuration();
        
        // Update pool boost totals before removing delegation
        PoolBoost storage poolBoost = poolBoosts[msg.sender];
        if (poolBoost.totalBoost >= delegation.amount) {
            poolBoost.totalBoost -= delegation.amount;
        }
        if (poolBoost.workingSupply >= delegation.amount) {
            poolBoost.workingSupply -= delegation.amount;
        }
        poolBoost.lastUpdateTime = block.timestamp;
        
        emit DelegationRemoved(from, msg.sender, delegation.amount);
        delete userBoosts[from][msg.sender];
    }
    
    /**
     * @notice Gets the working balance (effective boost) for a user in a pool
     * @param user Address of the user
     * @param pool Address of the pool
     * @return Current working balance
     */
    function getWorkingBalance(
        address user,
        address pool
    ) external view override returns (uint256) {
        if (!supportedPools[pool]) revert PoolNotSupported();
        UserBoost storage userBoost = userBoosts[user][pool];
        return userBoost.amount;
    }
    
    /**
     * @notice Calculates the current boost multiplier for a user in a pool
     * @param user Address of the user
     * @param pool Address of the pool
     * @return Current boost multiplier in basis points (1e4)
     */
    function getBoostMultiplier(
        address user,
        address pool
    ) external view override returns (uint256) {
        if (!supportedPools[pool]) revert PoolNotSupported();
        UserBoost storage userBoost = userBoosts[user][pool];
        if (userBoost.amount == 0) return MIN_BOOST;
        
        // Calculate actual boost multiplier in basis points
        uint256 baseAmount = userBoost.amount * 10000 / MAX_BOOST;
        return userBoost.amount * 10000 / baseAmount;
    }
    
    /**
     * @notice Retrieves boost information for a user in a pool
     * @param user Address of the user
     * @param pool Address of the pool
     * @return amount Current boost amount
     * @return expiry Expiration timestamp of the boost
     * @return delegatedTo Address the boost is delegated to
     * @return lastUpdateTime Last time the boost was updated
     */
    function getUserBoost(
        address user,
        address pool
    ) external view returns (
        uint256 amount,
        uint256 expiry,
        address delegatedTo,
        uint256 lastUpdateTime
    ) {
        UserBoost storage boost = userBoosts[user][pool];
        return (
            boost.amount,
            boost.expiry,
            boost.delegatedTo,
            boost.lastUpdateTime
        );
    }
    
    /**
     * @notice Retrieves boost information for a pool
     * @param pool Address of the pool
     * @return totalBoost Total boost allocated to the pool
     * @return workingSupply Current working supply of the pool
     * @return baseSupply Base supply before boost
     * @return lastUpdateTime Last time the pool boost was updated
     */
    function getPoolBoost(
        address pool
    ) external view returns (
        uint256 totalBoost,
        uint256 workingSupply,
        uint256 baseSupply,
        uint256 lastUpdateTime
    ) {
        if (!supportedPools[pool]) revert PoolNotSupported();
        PoolBoost storage boost = poolBoosts[pool];
        return (
            boost.totalBoost,
            boost.workingSupply,
            boost.baseSupply,
            boost.lastUpdateTime
        );
    }
    
    /**
     * @notice Sets the emergency shutdown state of the contract
     * @param paused True to pause, false to unpause
     * @dev Only callable by accounts with MANAGER_ROLE
     */
    function setEmergencyShutdown(bool paused) external onlyRole(MANAGER_ROLE) {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
        emit EmergencyShutdown(msg.sender, paused);
    }
    
    /**
     * @notice Updates the boost calculation parameters
     * @param maxBoost Maximum boost multiplier in basis points
     * @param minBoost Minimum boost multiplier in basis points
     * @param boostWindow Time window for boost calculations
     * @dev Only callable by accounts with MANAGER_ROLE
     */
    function setBoostParameters(
        uint256 maxBoost,
        uint256 minBoost,
        uint256 boostWindow
    ) external onlyRole(MANAGER_ROLE) {
        if (maxBoost < minBoost) revert InvalidBoostAmount();
        if (maxBoost > 50000) revert MaxBoostExceeded(); // Max 5x absolute limit
        if (boostWindow < 1 days || boostWindow > 30 days) revert InvalidDelegationDuration();
        
        boostState.maxBoost = maxBoost;
        boostState.minBoost = minBoost;
        boostState.boostWindow = boostWindow;
        
        emit BoostParametersUpdated(maxBoost, minBoost, boostWindow);
    }

    function updateTotalWeight() internal view returns (
        uint256 totalWeight,
        uint256 totalVotingPower,
        uint256 votingPower
    ) {
        return (
            veToken.getLockPosition(address(this)).amount,
            veToken.getTotalVotingPower(),
            veToken.getVotingPower(address(this), block.timestamp)
        );
    }
}
