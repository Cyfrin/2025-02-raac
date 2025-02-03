 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseGauge.sol";

/**
 * @title RAACGauge
 * @author RAAC Protocol Team
 * @notice Implements weekly gauge for RAAC emission direction with time-weighted voting
 * @dev Core gauge contract for managing RAAC token emissions and staking
 */
contract RAACGauge is BaseGauge {
    /**
     * @notice Constants for time periods and limits
     */
    uint256 public constant WEEK = 7 days;
    uint256 public constant MAX_WEEKLY_EMISSION = 500000e18;  // Maximum weekly emission

    /**
     * @notice Initializes the RAACGauge contract
     * @param _rewardToken Address of the reward token
     * @param _stakingToken Address of the staking token
     * @param _controller Address of the gauge controller
     */
    constructor(
        address _rewardToken,
        address _stakingToken,
        address _controller
    ) BaseGauge(
        _rewardToken,
        _stakingToken,
        _controller,
        MAX_WEEKLY_EMISSION,
        WEEK
    ) {}

    /**
     * @notice Gets period duration
     * @return Duration in seconds (1 week)
     */
    function getPeriodDuration() public pure override returns (uint256) {
        return WEEK;
    }

    /**
     * @notice Gets total weight (total staked amount)
     * @return Total weight value
     */
    function getTotalWeight() external view override returns (uint256) {
        return totalSupply();
    }

    function setWeeklyEmission(uint256 _weeklyEmission) external onlyController {
        periodState.emission = _weeklyEmission;
        emit EmissionUpdated(_weeklyEmission);
    }

    /**
     * @notice Allows users to vote on emission direction
     * @param direction Direction in basis points (0-10000)
     */
    function voteEmissionDirection(uint256 direction) external whenNotPaused {
        voteDirection(direction);
    }
}