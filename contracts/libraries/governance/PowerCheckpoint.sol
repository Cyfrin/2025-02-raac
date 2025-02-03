// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Checkpoints.sol";

/**
 * @title Power Checkpoint Library
 * @author RAAC Protocol Team
 * @notice Library for managing voting power checkpoints and historical data
 * @dev Extends Checkpoints library with additional functionality for tracking voting power
 * Key features:
 * - Historical voting power tracking
 * - Proposal-specific snapshots
 * - Total supply history
 * - Checkpoint compression
 */
library PowerCheckpoint {
    using Checkpoints for Checkpoints.Checkpoint[];

    /**
     * @notice Structure containing checkpoint state and mappings
     * @dev Stores user checkpoints, proposal snapshots, and total supply history
     */
    struct CheckpointState {
        mapping(address => Checkpoints.Checkpoint[]) userCheckpoints;     // Per-user voting power history
        mapping(uint256 => uint256) proposalSnapshots;                   // Block numbers for proposal snapshots
        Checkpoints.Checkpoint[] totalSupplyCheckpoints;                 // Historical total supply data
    }

    /**
     * @notice Structure representing a single checkpoint
     * @dev Stores voting power at a specific timestamp
     */
    struct Checkpoint {
        uint256 timestamp;    // Timestamp when checkpoint was created
        uint256 value;        // Voting power value at checkpoint
    }

    /**
     * @notice Emitted when a new checkpoint is created
     * @param user Address of the user for whom checkpoint was created
     * @param blockNumber Block number when checkpoint was created
     * @param power Voting power recorded in the checkpoint
     */
    event CheckpointCreated(address indexed user, uint256 blockNumber, uint256 power);

    /**
     * @notice Emitted when a proposal snapshot is set
     * @param proposalId ID of the proposal
     * @param blockNumber Block number of the snapshot
     */
    event ProposalSnapshotSet(uint256 indexed proposalId, uint256 blockNumber);

    /**
     * @notice Thrown when attempting to query an invalid block number
     */
    error InvalidBlockNumber();

    /**
     * @notice Thrown when power value exceeds maximum allowed
     */
    error PowerTooHigh();

    /**
     * @notice Thrown when proposal ID is invalid
     */
    error InvalidProposalId();

    /**
     * @notice Writes a new checkpoint for a user's voting power
     * @dev Creates a compressed checkpoint and emits an event
     * @param state The checkpoint state storage
     * @param user The user address for whom to write the checkpoint
     * @param newPower The new voting power value to record
     */
    function writeCheckpoint(
        CheckpointState storage state,
        address user,
        uint256 newPower
    ) internal {
        if (newPower > type(uint224).max) revert PowerTooHigh();
        
        uint32 blockNumber = uint32(block.number);
        uint224 compressedPower = Checkpoints.compress(newPower);
        
        Checkpoints.Checkpoint memory newCheckpoint = Checkpoints.Checkpoint({
            fromBlock: blockNumber,
            value: compressedPower
        });
        
        state.userCheckpoints[user].push(newCheckpoint);

        emit CheckpointCreated(user, blockNumber, newPower);
    }

    /**
     * @notice Gets voting power at a specific historical block
     * @dev Queries the checkpoint history to find the voting power
     * @param state The checkpoint state storage
     * @param user The user address to query
     * @param blockNumber The block number to query
     * @return The voting power at the specified block
     */
    function getPastVotingPower(
        CheckpointState storage state,
        address user,
        uint256 blockNumber
    ) internal view returns (uint256) {
        if (blockNumber >= block.number) revert InvalidBlockNumber();
        return state.userCheckpoints[user].findCheckpoint(blockNumber);
    }

    /**
     * @notice Gets past votes for a user at a specific block
     * @dev Alias for getPastVotingPower with different naming for governance compatibility
     * @param state The checkpoint state storage
     * @param account The user address to query
     * @param blockNumber The block number to query
     * @return The past votes at the specified block
     */
    function getPastVotes(
        CheckpointState storage state,
        address account,
        uint256 blockNumber
    ) internal view returns (uint256) {
        if (blockNumber >= block.number) revert InvalidBlockNumber();
        return state.userCheckpoints[account].findCheckpoint(blockNumber);
    }

    /**
     * @notice Sets a snapshot block for a proposal
     * @dev Records the block number for later power queries
     * @param state The checkpoint state storage
     * @param proposalId The ID of the proposal
     * @param blockNumber The block number to set as snapshot
     */
    function setProposalSnapshot(
        CheckpointState storage state,
        uint256 proposalId,
        uint256 blockNumber
    ) internal {
        if (proposalId == 0) revert InvalidProposalId();
        if (blockNumber >= block.number) revert InvalidBlockNumber();
        
        state.proposalSnapshots[proposalId] = blockNumber;
        emit ProposalSnapshotSet(proposalId, blockNumber);
    }

    /**
     * @notice Gets the total voting power at a specific block
     * @dev Queries the total supply checkpoint history
     * @param state The checkpoint state storage
     * @param blockNumber The block number to query
     * @return The total voting power at the specified block
     */
    function getPastTotalSupply(
        CheckpointState storage state,
        uint256 blockNumber
    ) internal view returns (uint256) {
        if (blockNumber >= block.number) revert InvalidBlockNumber();
        return state.totalSupplyCheckpoints.findCheckpoint(blockNumber);
    }
}
