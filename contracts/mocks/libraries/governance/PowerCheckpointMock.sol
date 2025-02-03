// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/PowerCheckpoint.sol";

contract PowerCheckpointMock {
    using PowerCheckpoint for PowerCheckpoint.CheckpointState;

    PowerCheckpoint.CheckpointState private _state;

    function writeCheckpoint(address user, uint256 power) external {
        _state.writeCheckpoint(user, power);
    }

    function getPastVotingPower(
        address user,
        uint256 blockNumber
    ) external view returns (uint256) {
        return _state.getPastVotingPower(user, blockNumber);
    }

    function getPastVotes(
        address account,
        uint256 blockNumber
    ) external view returns (uint256) {
        return _state.getPastVotes(account, blockNumber);
    }

    function setProposalSnapshot(
        uint256 proposalId,
        uint256 blockNumber
    ) external {
        _state.setProposalSnapshot(proposalId, blockNumber);
    }

    function getPastTotalSupply(uint256 blockNumber) external view returns (uint256) {
        return _state.getPastTotalSupply(blockNumber);
    }

    // Helper function for tests to get checkpoint block numbers
    function getCheckpointBlock(uint256 index) external view returns (uint256) {
        Checkpoints.Checkpoint[] storage checkpoints = _state.userCheckpoints[msg.sender];
        require(index < checkpoints.length, "Index out of bounds");
        return checkpoints[index].fromBlock;
    }

    // Helper function to get checkpoint count
    function getCheckpointCount(address user) external view returns (uint256) {
        return _state.userCheckpoints[user].length;
    }
}