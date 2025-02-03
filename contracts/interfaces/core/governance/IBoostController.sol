// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBoostController
 * @notice Interface for the boost controller contract that manages boost calculations and delegations
 * @dev Implements Curve-style boost mechanics with max 2.5x multiplier
 */
interface IBoostController {
    /**
     * @notice Struct to track user boost data for a specific pool or delegation
     * @param amount The amount of boost
     * @param expiry The expiration timestamp for delegations
     * @param delegatedTo The address the boost is delegated to (if applicable)
     * @param lastUpdateTime The last time the boost was updated
     */
    struct UserBoost {
        uint256 amount;
        uint256 expiry;
        address delegatedTo;
        uint256 lastUpdateTime;
    }

    /**
     * @notice Struct to track pool-wide boost metrics
     * @param totalBoost The total boost amount for the pool
     * @param workingSupply The total working supply including boosts
     * @param baseSupply The base supply without boosts
     * @param lastUpdateTime The last time pool boosts were updated
     */
    struct PoolBoost {
        uint256 totalBoost;
        uint256 workingSupply;
        uint256 baseSupply;
        uint256 lastUpdateTime;
    }

    /**
     * @notice Calculates the boost amount for a user in a specific pool
     * @param user The user address
     * @param pool The pool address
     * @param amount The base amount to boost
     * @return boostBasisPoints The calculated boost multiplier in basis points
     * @return boostedAmount The calculated boosted amount
     */
    function calculateBoost(
        address user,
        address pool,
        uint256 amount
    ) external view returns (uint256 boostBasisPoints, uint256 boostedAmount);

    /**
     * @notice Updates the boost for a user in a specific pool
     * @param user The user address
     * @param pool The pool address
     */
    function updateUserBoost(address user, address pool) external;

    /**
     * @notice Delegates boost to another address
     * @param to The recipient of the delegation
     * @param amount The amount to delegate
     * @param duration The duration of the delegation
     */
    function delegateBoost(
        address to,
        uint256 amount,
        uint256 duration
    ) external;

    /**
     * @notice Removes a boost delegation
     * @param from The address that delegated the boost
     */
    function removeBoostDelegation(address from) external;

    /**
     * @notice Gets the working balance (including boost) for a user in a pool
     * @param user The user address
     * @param pool The pool address
     * @return The working balance
     */
    function getWorkingBalance(
        address user,
        address pool
    ) external view returns (uint256);

    /**
     * @notice Gets the boost multiplier for a user in a pool
     * @param user The user address
     * @param pool The pool address
     * @return The boost multiplier in basis points (10000 = 1x)
     */
    function getBoostMultiplier(
        address user,
        address pool
    ) external view returns (uint256);

    /**
     * @notice Emitted when a boost is updated
     * @param user The user address
     * @param pool The pool address
     * @param newBoost The new boost amount
     */
    event BoostUpdated(address indexed user, address indexed pool, uint256 newBoost);

    /**
     * @notice Emitted when pool boost metrics are updated
     * @param pool The pool address
     * @param totalBoost The new total boost
     * @param workingSupply The new working supply
     */
    event PoolBoostUpdated(
        address indexed pool,
        uint256 totalBoost,
        uint256 workingSupply
    );

    /**
     * @notice Emitted when a boost is delegated
     * @param from The delegator address
     * @param to The recipient address
     * @param amount The delegated amount
     * @param duration The delegation duration
     */
    event BoostDelegated(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 duration
    );

    /**
     * @notice Emitted when a delegation is removed
     * @param from The delegator address
     * @param to The recipient address
     * @param amount The amount that was delegated
     */
    event DelegationRemoved(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    /**
     * @notice Emitted when emergency shutdown status changes
     * @param caller The address that triggered the shutdown
     * @param paused The new pause state
     */
    event EmergencyShutdown(address indexed caller, bool paused);

    /**
     * @notice Emitted when boost parameters are updated
     * @param maxBoost The new maximum boost
     * @param minBoost The new minimum boost
     * @param boostWindow The new boost window duration
     */
    event BoostParametersUpdated(
        uint256 maxBoost,
        uint256 minBoost,
        uint256 boostWindow
    );

    /**
     * @notice Emitted when a pool is added to supported pools
     * @param pool The address of the added pool
     */
    event PoolAdded(address indexed pool);

    /**
     * @notice Emitted when a pool is removed from supported pools
     * @param pool The address of the removed pool
     */
    event PoolRemoved(address indexed pool);

    /**
     * @notice Custom errors
     */

    /// @notice When boost amount is invalid (zero or exceeds maximum)
    error InvalidBoostAmount();

    /// @notice When delegation duration is outside allowed range
    error InvalidDelegationDuration();

    /// @notice When user has insufficient veToken balance
    error InsufficientVeBalance();

    /// @notice When boost is already delegated
    error BoostAlreadyDelegated();

    /// @notice When caller is not authorized for operation
    error UnauthorizedCaller();

    /// @notice When delegation is not found
    error DelegationNotFound();

    /// @notice When boost exceeds maximum allowed
    error MaxBoostExceeded();

    /// @notice When contract is in emergency pause
    error EmergencyPaused();

    /// @notice When pool address is invalid
    error InvalidPool();

    /// @notice When pool is not in supported pools list
    error PoolNotSupported();

    /// @notice When trying to use an unsupported pool
    error UnsupportedPool();
}
