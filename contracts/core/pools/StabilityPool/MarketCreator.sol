// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MarketCreator
 * @dev This contract manages the creation and participation in multiple markets within the RAAC ecosystem.
 * It allows the owner to create new markets with different quote assets, lock durations, and rewards.
 * Users can participate in these markets by depositing the specified quote asset.
 */
contract MarketCreator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        IERC20 quoteAsset;
        uint256 lockDuration;
        uint256 reward;
        uint256 totalDeposits;
    }

    struct UserPosition {
        uint256 amount;
        uint256 lockEndTime;
        bool exists;
    }

    // CONSTANTS
    uint256 public constant MAX_LOCK_DURATION = 365 days;
    uint256 public constant MAX_REWARD = 1000 * 1e18; // 1000 RAAC maximum

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => UserPosition)) public userPositions;
    uint256 public marketCount;

    IERC20 public raacToken;
    IERC20 public decrvUSDToken;

    // ERRORS
    error InvalidQuoteAsset();
    error InvalidLockDuration();
    error InvalidReward();

    // EVENTS
    event MarketCreated(uint256 indexed marketId, address quoteAsset, uint256 lockDuration, uint256 reward);
    event Participated(uint256 indexed marketId, address indexed user, uint256 amount);
    event Redeemed(uint256 indexed marketId, address indexed user, uint256 amount, uint256 reward);

    constructor(address initialOwner, address _raacToken, address _decrvUSDToken) Ownable(initialOwner) {
        raacToken = IERC20(_raacToken);
        decrvUSDToken = IERC20(_decrvUSDToken);
    }

    function createMarket(address _quoteAsset, uint256 _lockDuration, uint256 _reward) external onlyOwner {
        if (_quoteAsset == address(0)) revert InvalidQuoteAsset();
        if (_lockDuration == 0 || _lockDuration > MAX_LOCK_DURATION) revert InvalidLockDuration();
        if (_reward == 0 || _reward > MAX_REWARD) revert InvalidReward();
        
        marketCount++;
        markets[marketCount] = Market(IERC20(_quoteAsset), _lockDuration, _reward, 0);
        emit MarketCreated(marketCount, _quoteAsset, _lockDuration, _reward);
    }

    function participateInMarket(uint256 marketId, uint256 amount) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.quoteAsset != IERC20(address(0)), "Market does not exist");
        require(amount > 0, "Amount must be greater than 0");

        market.totalDeposits += amount;

        UserPosition storage position = userPositions[marketId][msg.sender];
        if (position.exists) {
            position.amount += amount;
            position.lockEndTime = block.timestamp + market.lockDuration;
        } else {
            userPositions[marketId][msg.sender] = UserPosition(amount, block.timestamp + market.lockDuration, true);
        }

        market.quoteAsset.safeTransferFrom(msg.sender, address(this), amount);

        emit Participated(marketId, msg.sender, amount);
    }

    function redeemFromMarket(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        UserPosition storage position = userPositions[marketId][msg.sender];
        require(position.exists, "No position found");
        require(block.timestamp >= position.lockEndTime, "Lock duration has not passed");

        uint256 amount = position.amount;
        uint256 reward = calculateReward(marketId, amount);

        market.totalDeposits -= amount;
        delete userPositions[marketId][msg.sender];

        market.quoteAsset.safeTransfer(msg.sender, amount);
        raacToken.safeTransfer(msg.sender, reward);

        emit Redeemed(marketId, msg.sender, amount, reward);
    }

    function calculateReward(uint256 marketId, uint256 amount) internal view returns (uint256) {
        Market storage market = markets[marketId];
        return (amount * market.reward) / market.totalDeposits;
    }

    function getMarketInfo(uint256 marketId) external view returns (IERC20, uint256, uint256, uint256) {
        Market storage market = markets[marketId];
        return (market.quoteAsset, market.lockDuration, market.reward, market.totalDeposits);
    }

    function getUserPosition(uint256 marketId, address user) external view returns (uint256, uint256, bool) {
        UserPosition storage position = userPositions[marketId][user];
        return (position.amount, position.lockEndTime, position.exists);
    }
}
