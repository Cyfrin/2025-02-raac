// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAuction {
    struct Bid {
        address bidder;
        uint256 amount;
    }

    struct AuctionDetails {
        address auctionAddress;
        address zenoAddress;
        address businessAddress;
        uint256 auctionEndTime;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 auctionStartTime;
        uint256 totalZENOAllocated;
        uint256 totalZENORemaining;
        uint256 lastBidTime;
        address lastBidder;
        uint256 lastBidAmount;
        uint256 price;
    }

    function getPrice() external view returns (uint256);
    function buy(uint256 amount) external;
    function checkAuctionEnded() external;
    function getDetails() external view returns (AuctionDetails memory);

    event ZENOPurchased(address indexed buyer, uint256 amount, uint256 price);
    event AuctionEnded(uint256 price);
} 