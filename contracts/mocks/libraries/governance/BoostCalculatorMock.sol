// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/BoostCalculator.sol";
import "../../../libraries/math/TimeWeightedAverage.sol";

contract BoostCalculatorMock {
    using BoostCalculator for BoostCalculator.BoostState;
    using TimeWeightedAverage for TimeWeightedAverage.Period;

    BoostCalculator.BoostState private _state;
    mapping(address => TimeWeightedAverage.Period) private _tempPeriods;
    
    event BoostCalculated(
        address indexed user,
        uint256 balance,
        uint256 totalSupply,
        uint256 amount,
        uint256 boostBasisPoints,
        uint256 boostedAmount
    );

    constructor() {
        _state.maxBoost = 25000; // 2.5x
        _state.minBoost = 10000; // 1x
        _state.boostWindow = 7 days;
        _state.baseWeight = 1e18;
        _state.totalVotingPower = 0;
        _state.totalWeight = 0;
    }

    function calculateTimeWeightedBoost(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount
    ) external returns (uint256, uint256) {
        // Update state before calculation
        _state.updateBoostPeriod();
        return _calculateTimeWeightedBoostView(userBalance, totalSupply, amount);
    }

    function calculateTimeWeightedBoostView(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount
    ) external view returns (uint256, uint256) {
        return _calculateTimeWeightedBoostView(userBalance, totalSupply, amount);
    }

    function _calculateTimeWeightedBoostView(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount
    ) internal view returns (uint256, uint256) {
        if (totalSupply == 0) return (0, amount);
        
        (uint256 boostBasisPoints, uint256 boostedAmount) = _state.calculateTimeWeightedBoost(
            userBalance,
            totalSupply,
            amount
        );
        
        // The boost returned is already the final boosted amount
        // No need for additional conversion since calculateTimeWeightedBoost
        // handles the conversion internally
        
        require(boostedAmount >= amount, "Boost below base amount");
        require(boostedAmount <= amount * _state.maxBoost / 10000, "Boost exceeds maximum");
        
        return (boostBasisPoints, boostedAmount);
    }

    function calculateMultiPeriodBoost(
        uint256[] memory balances,
        uint256[] memory timestamps,
        uint256 totalSupply,
        uint256 amount
    ) external returns (uint256, uint256) {
        require(balances.length == timestamps.length, "Invalid arrays length");
        require(balances.length > 0, "Empty arrays");

        TimeWeightedAverage.Period storage tempPeriod = _tempPeriods[msg.sender];
        
        // Initialize period
        TimeWeightedAverage.createPeriod(
            tempPeriod,
            timestamps[0],
            timestamps[timestamps.length - 1] - timestamps[0],
            balances[0],
            1e18 // Base weight
        );

        // Update values for each balance change
        for (uint256 i = 1; i < balances.length; i++) {
            tempPeriod.updateValue(balances[i], timestamps[i]);
        }

        uint256 weightedBalance = tempPeriod.calculateAverage(block.timestamp);
        return _calculateBoost(weightedBalance, totalSupply, amount);
    }

    function _calculateBoost(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount
    ) internal view returns (uint256, uint256) {
        if (totalSupply == 0) return (0, amount);   
        
        (uint256 boostBasisPoints, uint256 boostedAmount) = _state.calculateTimeWeightedBoost(
            userBalance,
            totalSupply,
            amount
        );
        
        require(boostedAmount >= amount, "Boost below base amount");
        require(boostedAmount <= amount * _state.maxBoost / 10000, "Boost exceeds maximum");
        
        return (boostBasisPoints, boostedAmount);
    }

    // State management functions
    function updateUserBalance(address user, uint256 balance) external {
        _state.updateUserBalance(user, balance);
    }

    function updateBoostPeriod() external {
        _state.updateBoostPeriod();
    }

    // Getters for testing
    function getBoostState() external view returns (
        uint256 maxBoost,
        uint256 minBoost,
        uint256 boostWindow,
        uint256 baseWeight, 
        uint256 totalVotingPower,
        uint256 totalWeight
    ) {
        return (
            _state.maxBoost,
            _state.minBoost,
            _state.boostWindow,
            _state.baseWeight,
            _state.totalVotingPower,
            _state.totalWeight
        );
    }

    // Test helper functions
    function setBoostParameters(
        uint256 maxBoost_,
        uint256 minBoost_,
        uint256 boostWindow_,
        uint256 baseWeight_,
        uint256 totalVotingPower_,
        uint256 totalWeight_
    ) external {
        _state.maxBoost = maxBoost_;
        _state.minBoost = minBoost_;
        _state.boostWindow = boostWindow_;
        _state.baseWeight = baseWeight_;
        _state.totalVotingPower = totalVotingPower_;
        _state.totalWeight = totalWeight_;
    }

    function setMaxBoost(uint256 maxBoost_) external {
        _state.maxBoost = maxBoost_;
    }

    function setMinBoost(uint256 minBoost_) external {
        _state.minBoost = minBoost_;
    }

    function setBoostWindow(uint256 boostWindow_) external {
        _state.boostWindow = boostWindow_;
    }

    function minBoost() external view returns (uint256) {
        return _state.minBoost;
    }

    function maxBoost() external view returns (uint256) {
        return _state.maxBoost;
    }

    function setVotingPower(uint256 votingPower_) external {
        _state.votingPower = votingPower_;
    }

    function setTotalVotingPower(uint256 totalVotingPower_) external {
        _state.totalVotingPower = totalVotingPower_;
    }

    function setTotalWeight(uint256 totalWeight_) external {
        _state.totalWeight = totalWeight_;
    }
}
