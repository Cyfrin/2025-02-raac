// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface INFTLiquidator {
    function setStabilityPool(address _stabilityPool) external;
    function liquidateNFT(uint256 tokenId, uint256 debt) external;
    function placeBid(uint256 tokenId, uint256 bidAmount) external;
    function claimAuction(uint256 tokenId) external;
    function buybackNFT(uint256 tokenId) external;
}