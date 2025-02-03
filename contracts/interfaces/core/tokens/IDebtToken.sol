// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDebtToken
 * @dev Interface for the DebtToken contract in the RAAC lending protocol.
 */
interface IDebtToken is IERC20 {
    /**
     * @notice Sets the Reserve Pool address
     * @param newReservePool The address of the Reserve Pool
     */
    function setReservePool(address newReservePool) external;

    /**
     * @notice Updates the usage index
     * @param newUsageIndex The new usage index
     */
    function updateUsageIndex(uint256 newUsageIndex) external;

    /**
     * @notice Mints debt tokens to a user
     * @param user The address initiating the mint
     * @param onBehalfOf The recipient of the debt tokens
     * @param amount The amount to mint (in underlying asset units)
     * @param index The usage index at the time of minting
     * @return A tuple containing:
     *         - bool: True if the previous balance was zero
     *         - uint256: The amount of scaled tokens minted
     *         - uint256: The new total supply after minting
     */
    function mint(
        address user,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external returns (bool, uint256, uint256);


    /**
     * @notice Burns debt tokens from a user
     * @param from The address from which tokens are burned
     * @param amount The amount to burn (in underlying asset units)
     * @param index The usage index at the time of burning
     * @return A tuple containing:
     *         - uint256: The amount of scaled tokens burned
     *         - uint256: The new total supply after burning
     *         - uint256: The amount of underlying tokens burned
     *         - uint256: The balance increase due to interest
     */
    function burn(
        address from,
        uint256 amount,
        uint256 index
    ) external returns (uint256, uint256, uint256, uint256);
    
    /**
     * @notice Returns the usage index
     * @return The usage index
     */
    function getUsageIndex() external view returns (uint256);

    /**
     * @notice Returns the Reserve Pool address
     * @return The Reserve Pool address
     */
    function getReservePool() external view returns (address);

    /**
     * @notice Returns the non-scaled balance of the user
     * @param user The address of the user
     * @return The user's non-scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Returns the non-scaled total supply
     * @return The non-scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256);
}