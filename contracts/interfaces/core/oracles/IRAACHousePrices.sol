// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRAACHousePrices {
    function tokenToHousePrice(uint256 _tokenId) external view returns (uint256);
    function oracle() external view returns (address);
    function lastUpdateTimestamp() external view returns (uint256);
    function UPDATE_INTERVAL() external view returns (uint256);
    function MAX_PRICE_AGE() external view returns (uint256);
    function tokenLastUpdateTimestamp(uint256 _tokenId) external view returns (uint256);

    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);

    function setOracle(address _oracle) external;
    function updatePriceFromOracle(uint256 _tokenId, uint256 _newPrice) external;
    function getLatestPrice(uint256 _tokenId) external view returns (uint256, uint256);
    function setHousePrice(uint256 _tokenId, uint256 _amount) external;
}