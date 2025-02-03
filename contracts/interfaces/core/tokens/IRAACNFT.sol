// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IRAACNFT is IERC721, IERC721Enumerable {
    function mint(uint256 _tokenId, uint256 _amount) external;
    function getHousePrice(uint256 _tokenId) external view returns (uint256);
    function addNewBatch(uint256 _batchSize) external;
    function setBaseUri(string memory _uri) external;
    function currentBatchSize() external view returns (uint256);

    // Events
    event NFTMinted(address indexed minter, uint256 tokenId, uint256 price);

    // Errors
    error RAACNFT__BatchSize();
    error RAACNFT__HousePrice();
    error RAACNFT__InsufficientFundsMint();
    error RAACNFT__InvalidAddress();
}