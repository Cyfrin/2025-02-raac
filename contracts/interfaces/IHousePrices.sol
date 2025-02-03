// contracts/interfaces/IHousePrices.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IHousePrices
 * @dev Interface for the HousePrices oracle contract
 */
interface IHousePrices {
    /**
     * @notice Gets the price of a house/NFT token
     * @param tokenId The ID of the token
     * @return price The price of the token in wei
     */
    function tokenToHousePrice(uint256 tokenId) external view returns (uint256);

    // Add any additional functions if required
}