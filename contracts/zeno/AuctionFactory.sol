// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Auction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionFactory is Ownable {
    Auction[] public auctions;

    event AuctionCreated(address auctionAddress);

    constructor(address _initialAddress) Ownable(_initialAddress) {}

    /**
        Create a new Auction
     */
    function createAuction(
        address _zenoAddress,
        address _usdcAddress,
        address _businessAddress,
        uint256 _auctionStartTime,
        uint256 _auctionEndTime,
        uint256 _startingPrice,
        uint256 _reservePrice,
        uint256 _totalZENOAllocated
    ) external onlyOwner {
        Auction newAuction = new Auction(
            _zenoAddress,
            _usdcAddress,
            _businessAddress,
            _auctionStartTime,
            _auctionEndTime,
            _startingPrice,
            _reservePrice,
            _totalZENOAllocated,
            address(this)
        );

        auctions.push(newAuction);
        emit AuctionCreated(address(newAuction));
    }

    /**
        Get all auctions
     */
    function getAuctions() external view returns (Auction[] memory) {
        return auctions;
    }

    /**
        Get a specific auction
     */

    function getAuction(uint256 index) external view returns (Auction) {
        return auctions[index];
    }

    /**
    
        @dev get auction details
     */
    function getAuctionDetails(
        uint256 index
    ) external view returns (Auction.AuctionDetails memory) {
        return auctions[index].getDetails();
    }

    /**
        Get the number of auctions
     */
    function getAuctionCount() external view returns (uint256) {
        return auctions.length;
    }
}
