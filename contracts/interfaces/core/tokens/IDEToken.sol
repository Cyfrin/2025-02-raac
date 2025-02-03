// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDEToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transferAsset(address user, uint256 amount) external;
    
    /**
     * @notice Returns the number of decimals used to get its user representation.
     * @return The number of decimals.
     */
    function decimals() external view returns (uint8);

      /**
     * @notice Emitted when the Stability Pool address is updated
     * @param oldStabilityPool The previous Stability Pool address
     * @param newStabilityPool The new Stability Pool address
     */
    event StabilityPoolUpdated(address indexed oldStabilityPool, address indexed newStabilityPool);

    /**
     * @notice Emitted when new DETokens are minted
     * @param to The address receiving the minted tokens
     * @param amount The amount of tokens minted
     */
    event Mint(address indexed to, uint256 amount);

    /**
     * @notice Emitted when DETokens are burned
     * @param from The address from which tokens are burned
     * @param amount The amount of tokens burned
     */
    event Burn(address indexed from, uint256 amount);

    /// @notice Thrown when a function is called by an address other than the Stability Pool
    error OnlyStabilityPool();

    /// @notice Thrown when an invalid address (e.g., zero address) is provided
    error InvalidAddress();

    /// @notice Thrown when an invalid amount (e.g., zero) is provided
    error InvalidAmount();
}
