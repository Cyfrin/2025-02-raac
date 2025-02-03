// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RAACHousePricesMock {
    mapping(uint256 => uint256) public prices;

    function setTokenPrice(uint256 tokenId, uint256 price) external {
        prices[tokenId] = price;
    }

    function tokenToHousePrice(uint256 tokenId) external view returns (uint256) {
        return prices[tokenId];
    }
}