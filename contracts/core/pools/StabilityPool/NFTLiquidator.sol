// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../tokens/IndexToken.sol";

/**
 * @title NFTLiquidator
 * @dev Manages the liquidation process for under-collateralized RAAC NFT loans.
 * Implements an auction mechanism for liquidated NFTs and interacts with the StabilityPool.
 *
 * Key features:
 * - Liquidation of under-collateralized NFTs
 * - Auction management for liquidated NFTs
 * - Integration with IndexToken for representing liquidated NFTs
 * - Buyback mechanism for liquidated NFTs
 */
contract NFTLiquidator is Ownable {
    IERC20 public crvUSD;
    IERC721 public nftContract;
    address public stabilityPool;
    IndexToken public indexToken;

    struct TokenData {
        uint256 debt;
        uint256 auctionEndTime;
        uint256 highestBid;
        address highestBidder;
    }

    mapping(uint256 => TokenData) public tokenData;

    uint256 public minBidIncreasePercentage;

    // Custom Errors
    error OnlyStabilityPool();
    error AuctionNotEnded();
    error NoBidsPlaced();
    error AuctionHasEnded();
    error BidTooLow(uint256 minBidAmount);
    error NFTNotInLiquidation();
    error InsufficientPayment(uint256 requiredAmount);

    // Events
    event NFTLiquidated(uint256 indexed tokenId, uint256 debt);
    event AuctionStarted(uint256 indexed tokenId, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 amount);
    event BuybackCompleted(uint256 indexed tokenId, address buyer, uint256 amount);
    event StabilityPoolSet(address newStabilityPool);
    event MinBidIncreasePercentageSet(uint256 newPercentage);

    /**
     * @dev Constructor to initialize the NFTLiquidator contract
     * @param _crvUSD Address of the crvUSD token contract
     * @param _nftContract Address of the NFT contract
     * @param initialOwner Address of the initial owner
     * @param _minBidIncreasePercentage Minimum percentage increase for new bids
     */
    constructor(
        address _crvUSD,
        address _nftContract,
        address initialOwner,
        uint256 _minBidIncreasePercentage
    ) Ownable(initialOwner) {
        crvUSD = IERC20(_crvUSD);
        nftContract = IERC721(_nftContract);
        indexToken = new IndexToken("Liquidated RAAC Index", "LRAAC");
        minBidIncreasePercentage = _minBidIncreasePercentage;
    }

    /**
     * @dev Sets the StabilityPool address
     * @param _stabilityPool New StabilityPool address
     */
    function setStabilityPool(address _stabilityPool) external onlyOwner {
        stabilityPool = _stabilityPool;
        emit StabilityPoolSet(_stabilityPool);
    }

    /**
     * @dev Sets the minimum bid increase percentage
     * @param _minBidIncreasePercentage New minimum bid increase percentage
     */
    function setMinBidIncreasePercentage(uint256 _minBidIncreasePercentage) external onlyOwner {
        minBidIncreasePercentage = _minBidIncreasePercentage;
        emit MinBidIncreasePercentageSet(_minBidIncreasePercentage);
    }

    /**
     * @dev Liquidates an NFT and starts the auction process
     * @param tokenId The ID of the NFT to be liquidated
     * @param debt The amount of debt associated with the NFT
     */
    function liquidateNFT(uint256 tokenId, uint256 debt) external {
        if (msg.sender != stabilityPool) revert OnlyStabilityPool();
        
        nftContract.transferFrom(msg.sender, address(this), tokenId);
        
        tokenData[tokenId] = TokenData({
            debt: debt,
            auctionEndTime: block.timestamp + 3 days,
            highestBid: 0,
            highestBidder: address(0)
        });

        indexToken.mint(stabilityPool, debt);

        emit NFTLiquidated(tokenId, debt);
        emit AuctionStarted(tokenId, debt, tokenData[tokenId].auctionEndTime);
    }

    /**
     * @dev Allows users to place bids on liquidated NFTs
     * @param tokenId The ID of the NFT being auctioned
     */
    function placeBid(uint256 tokenId) external payable {
        TokenData storage data = tokenData[tokenId];
        if (block.timestamp >= data.auctionEndTime) revert AuctionHasEnded();
        
        uint256 minBidAmount = data.highestBid + (data.highestBid * minBidIncreasePercentage / 100);
        if (msg.value <= minBidAmount) revert BidTooLow(minBidAmount);

        if (data.highestBidder != address(0)) {
            payable(data.highestBidder).transfer(data.highestBid);
        }

        data.highestBid = msg.value;
        data.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    /**
     * @dev Ends the auction for a specific NFT
     * @param tokenId The ID of the NFT whose auction is ending
     */
    function endAuction(uint256 tokenId) external {
        TokenData storage data = tokenData[tokenId];
        if (block.timestamp < data.auctionEndTime) revert AuctionNotEnded();
        if (data.highestBidder == address(0)) revert NoBidsPlaced();

        address winner = data.highestBidder;
        uint256 winningBid = data.highestBid;

        delete tokenData[tokenId];

        nftContract.transferFrom(address(this), winner, tokenId);
        payable(stabilityPool).transfer(winningBid);

        emit AuctionEnded(tokenId, winner, winningBid);
    }

    /**
     * @dev Allows users to buy back liquidated NFTs at a premium
     * @param tokenId The ID of the NFT to be bought back
     */
    function buyBackNFT(uint256 tokenId) external payable {
        TokenData storage data = tokenData[tokenId];
        if (block.timestamp >= data.auctionEndTime) revert AuctionHasEnded();
        
        if (nftContract.ownerOf(tokenId) != address(this)) revert NFTNotInLiquidation();
        
        uint256 price = data.debt * 11 / 10; // 110% of the debt
        if (msg.value < price) revert InsufficientPayment(price);

        // Refund the highest bidder if there's an existing bid
        if (data.highestBidder != address(0)) {
            payable(data.highestBidder).transfer(data.highestBid);
        }

        delete tokenData[tokenId];

        nftContract.transferFrom(address(this), msg.sender, tokenId);
        payable(stabilityPool).transfer(price);

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    
        emit BuybackCompleted(tokenId, msg.sender, price);
    }
}
