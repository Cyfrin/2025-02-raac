// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RAACHousePrices
 * @dev Contract for managing house prices associated with RAAC tokens.
 * This contract allows an oracle to update prices and provides functions to retrieve the latest prices.
 */
contract RAACHousePrices is Ownable {
    /// @notice Mapping from RAAC tokenId to house price in USD
    mapping(uint256 => uint256) public tokenToHousePrice;
    address public oracle;

    /// @notice Timestamp of the last price update
    uint256 public lastUpdateTimestamp;

    /// @notice Emitted when a price is updated
    event PriceUpdated(uint256 tokenId, uint256 newPrice);

    modifier onlyOracle() {
        require(msg.sender == oracle, "RAACHousePrices: caller is not the oracle");
        _;
    }

    /**
     * @notice Retrieves the latest price and update timestamp for a given token
     * @param _tokenId The ID of the RAAC token
     * @return The latest price and the timestamp of the last update
     *
     * Returns token-specific update timestamp
     */
    function getLatestPrice(
        uint256 _tokenId
    ) external view returns (uint256, uint256) {
        return (tokenToHousePrice[_tokenId], lastUpdateTimestamp);
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Allows the owner to set the house price for a token
     * @param _tokenId The ID of the RAAC token
     * @param _amount The price to set for the house in USD
     *
     * Updates timestamp for each token individually
     */
    function setHousePrice(
        uint256 _tokenId,
        uint256 _amount
    ) external onlyOracle {
        tokenToHousePrice[_tokenId] = _amount;
        lastUpdateTimestamp = block.timestamp;
        emit PriceUpdated(_tokenId, _amount);
    }

    /**
     * @notice Allows the owner to set the oracle address
     * @param _oracle The address of the oracle
     */
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}
