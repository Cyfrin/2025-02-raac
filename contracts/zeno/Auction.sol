// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ZENO.sol";
import "../interfaces/IUSDC.sol";
import "../interfaces/zeno/IAuction.sol";

/**
    RAAC Auction Contract
    This contract is used to auction off ZENO tokens in exchange for USDC.

    The USDC will be transferred to the business address, and the ZENO will be minted to the buyer.
 */
contract Auction is IAuction, Ownable {
    struct AuctionState {
        uint256 endTime;
        uint256 startTime;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 totalAllocated;
        uint256 totalRemaining;
        uint256 lastBidTime;
        address lastBidder;
    }

    ZENO public immutable zeno;
    IUSDC public immutable usdc;
    address public immutable businessAddress;
    AuctionState public state;
    mapping(address => uint256) public bidAmounts;

    modifier whenActive() {
        require(block.timestamp > state.startTime, "Auction not started");
        require(block.timestamp < state.endTime, "Auction ended");
        _;
    }

    constructor(
        address _zenoAddress,
        address _usdcAddress,
        address _businessAddress,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startingPrice,
        uint256 _reservePrice,
        uint256 _totalAllocated,
        address _initialOwner
    ) Ownable(_initialOwner) {
        zeno = ZENO(_zenoAddress);
        usdc = IUSDC(_usdcAddress);
        businessAddress = _businessAddress;
        state = AuctionState({
            startTime: _startTime,
            endTime: _endTime,
            startingPrice: _startingPrice,
            reservePrice: _reservePrice,
            totalAllocated: _totalAllocated,
            totalRemaining: _totalAllocated,
            lastBidTime: 0,
            lastBidder: address(0)
        });
    }

    /**
        Get current slippage price of ZENO
     */
    function getPrice() public view returns (uint256) {
        if (block.timestamp < state.startTime) return state.startingPrice;
        if (block.timestamp >= state.endTime) return state.reservePrice;
        
        return state.startingPrice - (
            (state.startingPrice - state.reservePrice) * 
            (block.timestamp - state.startTime) / 
            (state.endTime - state.startTime)
        );
    }

    /**
        Bid on the ZENO auction
        User will able to buy ZENO tokens in exchange for USDC
     */
    function buy(uint256 amount) external whenActive {
        require(amount <= state.totalRemaining, "Not enough ZENO remaining");
        uint256 price = getPrice();
        uint256 cost = price * amount;
        require(usdc.transferFrom(msg.sender, businessAddress, cost), "Transfer failed");

        bidAmounts[msg.sender] += amount;
        state.totalRemaining -= amount;
        state.lastBidTime = block.timestamp;
        state.lastBidder = msg.sender;

        zeno.mint(msg.sender, amount);
        emit ZENOPurchased(msg.sender, amount, price);
    }

    function checkAuctionEnded() external {
        require(block.timestamp >= state.endTime, "Auction not ended");
        emit AuctionEnded(getPrice());
    }

    function getDetails() external view returns (AuctionDetails memory) {
        return AuctionDetails(
            address(this),
            address(zeno),
            businessAddress,
            state.endTime,
            state.startingPrice,
            state.reservePrice,
            state.startTime,
            state.totalAllocated,
            state.totalRemaining,
            state.lastBidTime,
            state.lastBidder,
            bidAmounts[state.lastBidder],
            getPrice()
        );
    }
}
