// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/Checkpoints.sol";

contract CheckpointsMock {
    using Checkpoints for Checkpoints.Checkpoint[];
    
    Checkpoints.Checkpoint[] private _checkpoints;

    function writeCheckpoint(uint256 value) external returns (uint32, uint224) {
        return _checkpoints.writeCheckpoint(_defaultOperation, value);
    }

    function findCheckpoint(uint256 blockNumber) external view returns (uint256) {
        return _checkpoints.findCheckpoint(blockNumber);
    }

    function getLatestCheckpoint() external view returns (uint32, uint224) {
        uint256 pos = _checkpoints.checkpointCount();
        if (pos == 0) {
            return (0, 0);
        }
        Checkpoints.Checkpoint storage last = _checkpoints[pos - 1];
        return (last.fromBlock, last.value);
    }

    function getAllCheckpoints() external view returns (Checkpoints.Checkpoint[] memory) {
        return _checkpoints;
    }

    function length() external view returns (uint256) {
        return _checkpoints.checkpointCount();
    }

    function _defaultOperation(uint256 _a, uint256 b) internal pure returns (uint256) {
        return b;
    }
}