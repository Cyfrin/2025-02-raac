// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Time-Weighted Average Library
 * @author RAAC Protocol Team
 * @notice Library for calculating time-weighted averages with support for weighted periods
 * @dev Provides functionality for tracking and calculating time-weighted averages of values
 * Key features:
 * - Period creation and management
 * - Time-weighted value tracking
 * - Support for weighted periods
 * - Multiple period calculations
 */

library TimeWeightedAverage {
    /**
     * @notice Structure representing a time period with associated value and weight
     * @dev Stores all necessary data for time-weighted calculations
     */
    struct Period {
        uint256 startTime;        // Beginning timestamp of the period
        uint256 endTime;          // End timestamp of the period
        uint256 lastUpdateTime;   // Last timestamp the value was updated
        uint256 value;            // Current value being tracked
        uint256 weightedSum;      // Running sum of time-weighted values
        uint256 totalDuration;    // Total duration of accumulated values
        uint256 weight;           // Weight applied to period (scaled by 1e18)
    }

    /**
     * @notice Parameters for calculating averages across multiple periods
     * @dev Used when processing multiple time periods in batch
     */
    struct PeriodParams {
        uint256 startTime;        // Start timestamp of period
        uint256 endTime;          // End timestamp of period
        uint256 value;            // Value for period
        uint256 weight;           // Weight of period (scaled by 1e18)
    }

    /**
     * @notice Emitted when a new period is created
     * @param startTime Start timestamp of the period
     * @param duration Duration in seconds
     * @param initialValue Starting value
     */
    event PeriodCreated(uint256 startTime, uint256 duration, uint256 initialValue);

    /**
     * @notice Emitted when a period's value is updated
     * @param timestamp Time of update
     * @param oldValue Previous value
     * @param newValue New value
     */
    event ValueUpdated(uint256 timestamp, uint256 oldValue, uint256 newValue);

    /**
     * @notice Thrown when timestamp is outside valid range
     */
    error InvalidTime();

    /**
     * @notice Thrown when weight parameter is invalid
     */
    error InvalidWeight();

    /**
     * @notice Thrown when period duration is zero
     */
    error ZeroDuration();

    /**
     * @notice Thrown when start time is invalid
     */
    error InvalidStartTime();

    /**
     * @notice Thrown when value calculation overflows
     */
    error ValueOverflow();

    /**
     * @notice Thrown when weight is zero
     */
    error ZeroWeight();

    /**
     * @notice Thrown when period has not elapsed
     */
    error PeriodNotElapsed();

    /**
     * @notice Creates a new time-weighted average period
     * @dev Initializes a period with given parameters and validates inputs
     * @param self Storage reference to Period struct
     * @param startTime Start time of the period
     * @param duration Duration of the period
     * @param initialValue Initial value for the period
     * @param weight Weight to apply to the period (scaled by 1e18)
     */
    function createPeriod(
        Period storage self,
        uint256 startTime,
        uint256 duration,
        uint256 initialValue,
        uint256 weight
    ) internal {
        if (self.startTime != 0 && startTime < self.startTime + self.totalDuration) {
            revert PeriodNotElapsed();
        }

        if (duration == 0) revert ZeroDuration();
        if (weight == 0) revert ZeroWeight();

        self.startTime = startTime;
        self.endTime = startTime + duration;
        self.lastUpdateTime = startTime;
        self.value = initialValue;
        self.weightedSum = 0;
        self.totalDuration = duration;
        self.weight = weight;

        emit PeriodCreated(startTime, duration, initialValue);
    }

    /**
     * @notice Updates current value and accumulates time-weighted sums
     * @dev Calculates weighted sum based on elapsed time since last update
     * @param self Storage reference to Period struct
     * @param newValue New value to set
     * @param timestamp Time of update
     */
    function updateValue(
        Period storage self,
        uint256 newValue,
        uint256 timestamp
    ) internal {
        if (timestamp < self.startTime || timestamp > self.endTime) {
            revert InvalidTime();
        }

        unchecked {
            uint256 duration = timestamp - self.lastUpdateTime;
            if (duration > 0) {
                uint256 timeWeightedValue = self.value * duration;
                if (timeWeightedValue / duration != self.value) revert ValueOverflow();
                self.weightedSum += timeWeightedValue;
                self.totalDuration += duration;
            }
        }

        self.value = newValue;
        self.lastUpdateTime = timestamp;
    }

    /**
     * @notice Calculates time-weighted average up to timestamp
     * @dev Includes current period if timestamp > lastUpdateTime
     * @param self Storage reference to Period struct
     * @param timestamp Timestamp to calculate average up to
     * @return Time-weighted average value
     */
    function calculateAverage(
        Period storage self,
        uint256 timestamp
    ) internal view returns (uint256) {
        if (timestamp <= self.startTime) return self.value;
        
        uint256 endTime = timestamp > self.endTime ? self.endTime : timestamp;
        uint256 totalWeightedSum = self.weightedSum;
        
        if (endTime > self.lastUpdateTime) {
            uint256 duration = endTime - self.lastUpdateTime;
            uint256 timeWeightedValue = self.value * duration;
            if (duration > 0 && timeWeightedValue / duration != self.value) revert ValueOverflow();
            totalWeightedSum += timeWeightedValue;
        }
        
        return totalWeightedSum / (endTime - self.startTime);
    }

    /**
     * @notice Gets current value without time-weighting
     * @param self Storage reference to Period struct
     * @return Current raw value
     */
    function getCurrentValue(Period storage self) internal view returns (uint256) {
        return self.value;
    }

    /**
     * @notice Calculates average across multiple periods
     * @dev Handles sequential or overlapping periods with weights
     * @param periods Array of period parameters
     * @param timestamp Timestamp to calculate up to
     * @return weightedAverage Time-weighted average across periods
     */
    function calculateTimeWeightedAverage(
        PeriodParams[] memory periods,
        uint256 timestamp
    ) public pure returns (uint256 weightedAverage) {
        uint256 totalWeightedSum;
        uint256 totalDuration;
        // We will iterate through each period and calculate the time-weighted average
        for (uint256 i = 0; i < periods.length; i++) {
            if (timestamp <= periods[i].startTime) continue;
            
            uint256 endTime = timestamp > periods[i].endTime ? periods[i].endTime : timestamp;
            uint256 duration = endTime - periods[i].startTime;
            
            unchecked {
                 // Calculate time-weighted value by multiplying value by duration
                // This represents the area under the curve for this period
                uint256 timeWeightedValue = periods[i].value * duration;
                if (timeWeightedValue / duration != periods[i].value) revert ValueOverflow();
                totalWeightedSum += timeWeightedValue * periods[i].weight;
                totalDuration += duration;
            }
        }
        
        return totalDuration == 0 ? 0 : totalWeightedSum / (totalDuration * 1e18);
    }
}
