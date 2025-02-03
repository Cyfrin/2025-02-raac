// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/VotingPowerLib.sol";
import "../../../libraries/governance/RAACVoting.sol";
import "../../../libraries/math/TimeWeightedAverage.sol";
import "../../../libraries/governance/Checkpoints.sol";
import "hardhat/console.sol";

contract VotingPowerMock {
    using VotingPowerLib for VotingPowerLib.VotingPowerState;
    using RAACVoting for RAACVoting.Point;
    using TimeWeightedAverage for TimeWeightedAverage.Period;
    using Checkpoints for Checkpoints.Checkpoint[];

    VotingPowerLib.VotingPowerState private _state;
    uint256 public constant MAX_BOOST = 25000; // 2.5x

    event PowerUpdated(
        address indexed user,
        uint256 amount,
        uint256 unlockTime,
        int128 bias,
        int128 slope
    );

    function calculateAndUpdatePower(
        address user,
        uint256 amount,
        uint256 unlockTime
    ) external returns (int128 bias, int128 slope) {
        (bias, slope) = _state.calculateAndUpdatePower(
            user,
            amount,
            unlockTime
        );
        emit PowerUpdated(user, amount, unlockTime, bias, slope);
        return (bias, slope);
    }

    function getCurrentPower(address account) external view returns (uint256) {
        return _state.getCurrentPower(account, block.timestamp);
    }

    function writeCheckpoint(
        address account,
        uint256 newPower
    ) external {
        _state.writeCheckpoint(account, newPower);
    }

    function getLastAccountCheckpoint(address account) external view returns (Checkpoints.Checkpoint memory) {
        return _state.getLastAccountCheckpoint(account);
    }

    function getPoint(address user) external view returns (
        int128 bias,
        int128 slope,
        uint256 timestamp
    ) {
        RAACVoting.Point memory point = _state.points[user];
        return (point.bias, point.slope, point.timestamp);
    }

    function getSlopeChange(uint256 timestamp) external view returns (int128) {
        return _state.slopeChanges[timestamp];
    }

    function calculatePowerAtTimestamp(
        address account,
        uint256 timestamp
    ) external view returns (uint256) {
        return _state.calculatePowerAtTimestamp(account, timestamp);
    }

    function calculateBoost(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 amount
    ) external pure returns (uint256) {
        return VotingPowerLib.calculateBoost(userBalance, totalSupply, amount, MAX_BOOST);
    }

    function calculateInitialPower(
        uint256 amount,
        uint256 duration
    ) external view returns (uint256) {
        return VotingPowerLib.calculateInitialPower(amount, duration, block.timestamp);
    }

    /**
     * @notice Simulates batch power updates for gas testing
     */
    function batchUpdatePower(
        address[] calldata users,
        uint256[] calldata amounts,
        uint256[] calldata unlockTimes
    ) external returns (uint256 totalGas) {
        require(
            users.length == amounts.length && 
            amounts.length == unlockTimes.length,
            "Length mismatch"
        );

        uint256 gasStart = gasleft();
        
        for (uint256 i = 0; i < users.length; i++) {
            _state.calculateAndUpdatePower(
                users[i],
                amounts[i],
                unlockTimes[i]
            );
        }

        return gasStart - gasleft();
    }

    /**
     * @notice Simulates checkpoint batch updates for gas testing
     */
    function batchWriteCheckpoints(
        address user,
        uint256[] calldata powers
    ) external returns (uint256 totalGas) {
        uint256 gasStart = gasleft();
        
        for (uint256 i = 0; i < powers.length; i++) {
            _state.writeCheckpoint(user, powers[i]);
        }

        return gasStart - gasleft();
    }

    /**
     * @notice Gets the number of checkpoints for an account
     */
    function getCheckpointCount(address account) external view returns (uint256) {
        return _state.checkpoints[account].length;
    }

    /**
     * @notice Gets a specific checkpoint for an account
     */
    function getCheckpointAt(
        address account, 
        uint256 index
    ) external view returns (uint32 fromBlock, uint224 value) {
        Checkpoints.Checkpoint[] storage checkpoints = _state.checkpoints[account];
        require(index < checkpoints.length, "Index out of bounds");
        Checkpoints.Checkpoint storage checkpoint = checkpoints[index];
        return (checkpoint.fromBlock, checkpoint.value);
    }
}
