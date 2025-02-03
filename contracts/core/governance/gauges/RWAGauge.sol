 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseGauge.sol";

/**
 * @title RWAGauge
 * @notice Monthly gauge for RWA yield direction with time-weighted voting
 * @dev Implements monthly periods and voting power decay for RWA yield direction
 * Experimental and incomplete implementation - do not use in production
 */
contract RWAGauge is BaseGauge {
    /**
     * @notice Constants
     */
    uint256 public constant MONTH = 30 days;
    uint256 public constant MAX_MONTHLY_EMISSION = 2500000e18;  // 2.5M tokens

    /**
     * @notice Initializes the RWAGauge contract
     * @param _rewardToken Address of the reward token
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
        MAX_MONTHLY_EMISSION,
        MONTH
    ) {}

    /**
     * @notice Gets the duration of a period
     * @return Duration in seconds (30 days)
     */
    function getPeriodDuration() public pure override returns (uint256) {
        return MONTH;
    }

    /**
     * @notice Gets total weight of the gauge
     * @return Total supply as weight
     */
    function getTotalWeight() external view override returns (uint256) {
        return totalSupply();
    }

    function setMonthlyEmission(uint256 _monthlyEmission) external onlyController {
        periodState.emission = _monthlyEmission;
        emit EmissionUpdated(_monthlyEmission);
    }

    /**
     * @notice Allows users to vote on yield direction
     * @param direction Direction in basis points (0-10000)
     */
    function voteYieldDirection(uint256 direction) external whenNotPaused {
        super.voteDirection(direction);
    }
}