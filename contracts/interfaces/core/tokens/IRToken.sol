// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IRToken
 * @notice Interface for the RToken contract
 * @dev Extends the IERC20 interface and includes minting and burning functionalities restricted to designated roles.
 */
interface IRToken is IERC20 {

    /**
     * @notice Mints RToken to a user
     * @param caller The address initiating the mint
     * @param onBehalfOf The recipient of the minted tokens
     * @param amount The amount of tokens to mint (in underlying asset units)
     * @param index The liquidity index at the time of minting
     * @return A tuple containing:
     *         - bool: True if this is the first mint for the recipient, false otherwise
     *         - uint256: The amount of scaled tokens minted
     *         - uint256: The new total supply after minting
     *         - uint256: The amount of underlying tokens minted
     */
    function mint(
        address caller,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external returns (bool, uint256, uint256, uint256);

    /**
     * @notice Burns RToken from a user and transfers underlying asset
     * @param from The address from which tokens are burned
     * @param receiverOfUnderlying The address receiving the underlying asset
     * @param amount The amount to burn (in underlying asset units)
     * @param index The liquidity index at the time of burning
     * @return A tuple containing:
     *         - uint256: The amount of scaled tokens burned
     *         - uint256: The new total supply after burning
     *         - uint256: The amount of underlying asset burned
     */
    function burn(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external returns (uint256, uint256, uint256);

    /**
     * @notice Sets the reserve pool address. Only callable by the contract owner.
     * @param _reservePool The address of the reserve pool
     */
    function setReservePool(address _reservePool) external;

    /**
     * @notice Transfers the underlying asset to the specified user
     * @param user The address of the user to receive the asset
     * @param amount The amount of the asset to transfer
     */
    function transferAsset(address user, uint256 amount) external;

    /**
     * @notice Returns the current liquidity index.
     * @return The liquidity index
     */
    function getLiquidityIndex() external view returns (uint256);

    /**
     * @notice Updates the liquidity index.
     * @param newLiquidityIndex The new liquidity index value
     */
    function updateLiquidityIndex(uint256 newLiquidityIndex) external;

    /**
     * @notice Returns the scaled balance of a user
     * @param user The address of the user
     * @return The scaled balance of the user
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Returns the scaled total supply
     * @return The scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256);

    /**
     * @notice Returns the address of the reserve pool
     * @return The address of the reserve pool
     */
    function getReservePool() external view returns (address);

    /**
     * @notice Returns the address of the underlying asset
     * @return The address of the underlying asset
     */
    function getAssetAddress() external view returns (address);

    /**
     * @notice Returns the number of decimals used to get its user representation.
     * @return The number of decimals.
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Transfers accrued dust to a recipient
     * @param recipient The address to receive the dust
     * @param amount The amount of dust to transfer
     */
    function transferAccruedDust(address recipient, uint256 amount) external;

    /**
     * @notice Calculate the dust amount in the contract
     * @return The amount of dust in the contract
     * @dev Dust is the difference between actual contract balance and total real obligations to token holders
     */
    function calculateDustAmount() external view returns (uint256);

       // EVENTS

    /**
     * @notice Emitted when the Reserve Pool address is updated
     * @param oldReservePool The old Reserve Pool address
     * @param newReservePool The new Reserve Pool address
     */
    event ReservePoolUpdated(address indexed oldReservePool, address indexed newReservePool);

    /**
     * @notice Emitted when the liquidity index is updated
     * @param newLiquidityIndex The new liquidity index
     */
    event LiquidityIndexUpdated(uint256 newLiquidityIndex);

    /**
     * @notice Emitted when tokens are minted
     * @param caller The address initiating the mint
     * @param onBehalfOf The recipient of the minted tokens
     * @param amount The amount minted (in underlying asset units)
     * @param index The liquidity index at the time of minting
     */
    event Mint(address indexed caller, address indexed onBehalfOf, uint256 amount, uint256 index);

    /**
     * @notice Emitted when tokens are burned
     * @param from The address from which tokens are burned
     * @param receiverOfUnderlying The address receiving the underlying asset
     * @param amount The amount burned (in underlying asset units)
     * @param index The liquidity index at the time of burning
     */
    event Burn(address indexed from, address indexed receiverOfUnderlying, uint256 amount, uint256 index);

    /**
     * @notice Emitted during a token transfer
     * @param from The sender address
     * @param to The recipient address
     * @param value The amount transferred (in scaled units)
     * @param index The liquidity index at the time of transfer
     */
    event BalanceTransfer(address indexed from, address indexed to, uint256 value, uint256 index);

    /**
     * @notice Emitted when the burner address is set
     * @param burner The address of the burner
     */ 
    event BurnerSet(address indexed burner);

    /**
     * @notice Emitted when the minter address is set
     * @param minter The address of the minter
     */
    event MinterSet(address indexed minter);
   
    /**
     * @notice Emitted when the only reserve pool modifier is not met
     */
    error OnlyReservePool();
    /**
     * @notice Emitted when the address is zero
     */
    error InvalidAddress();
    /**
     * @notice Emitted when the amount is zero or unexpected
     */
    error InvalidAmount();
    /**
     * @notice Emitted when the main asset is being rescued (cannot be rescued)
     */
    error CannotRescueMainAsset();
    /**
     * @notice Emitted when there is no dust to transfer
     */
    error NoDust();
    /**
     * @notice Emitted when the dust is transferred
     * @param recipient The address that received the dust
     * @param amount The amount of dust transferred
     */
    event DustTransferred(address indexed recipient, uint256 amount);

}
