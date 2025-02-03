// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/math/TimeWeightedAverage.sol";

contract TimeWeightedAverageMock {
    using TimeWeightedAverage for TimeWeightedAverage.Period;
    
    TimeWeightedAverage.Period public period;
    
    function createPeriod(
        uint256 startTime,
        uint256 duration,
        uint256 initialValue,
        uint256 weight
    ) external {
        period.createPeriod(startTime, duration, initialValue, weight);
    }
    
    function updateValue(uint256 newValue, uint256 timestamp) external {
        period.updateValue(newValue, timestamp);
    }
    
    function calculateAverage(uint256 timestamp) external view returns (uint256) {
        return period.calculateAverage(timestamp);
    }
    
    function getCurrentValue() external view returns (uint256) {
        return period.getCurrentValue();
    }
    
    function getPeriodValue() external view returns (uint256) {
        return period.getCurrentValue();
    }

    function calculateTimeWeightedAverage(
        TimeWeightedAverage.PeriodParams[] memory periods,
        uint256 timestamp
    ) external pure returns (uint256) {
        return TimeWeightedAverage.calculateTimeWeightedAverage(periods, timestamp);
    }

    function getPeriodDetails() external view returns (
        TimeWeightedAverage.Period memory
    ) {
        return period;
    }
}