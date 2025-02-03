# PowerCheckpoint

## Overview

The PowerCheckpoint library provides functionality for managing voting power checkpoints and historical data in governance systems. It extends the base Checkpoints library with specialized features for tracking voting power over time, managing proposal snapshots, and maintaining total supply history with efficient compression.

## Purpose

- Track historical voting power for governance participants
- Manage proposal-specific voting power snapshots
- Maintain compressed checkpoint history for gas efficiency
- Track total supply changes over time
- Support governance power queries at specific blocks
- Provide safe checkpoint compression and validation

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| writeCheckpoint | Creates new compressed checkpoint | Internal | `state`: Checkpoint state<br>`user`: User address<br>`newPower`: New voting power | None |
| getPastVotingPower | Gets voting power at historical block | Internal View | `state`: Checkpoint state<br>`user`: User address<br>`blockNumber`: Target block | uint256: Historical voting power |
| getPastVotes | Gets past votes (governance compatibility) | Internal View | `state`: Checkpoint state<br>`account`: User address<br>`blockNumber`: Target block | uint256: Historical votes |
| setProposalSnapshot | Sets snapshot block for proposal | Internal | `state`: Checkpoint state<br>`proposalId`: Proposal ID<br>`blockNumber`: Snapshot block | None |
| getPastTotalSupply | Gets total supply at historical block | Internal View | `state`: Checkpoint state<br>`blockNumber`: Target block | uint256: Historical total supply |

## Implementation Details

### Features:

- Data management using CheckpointState struct
- Compressed checkpoint storage for gas efficiency
- Event emission for state changes
- Block number validation and bounds checking
- Proposal snapshot management
- Total supply history tracking
- Power value compression

## Data Structures

### CheckpointState
| Field | Type | Description |
|-------|------|-------------|
| userCheckpoints | mapping(address => Checkpoint[]) | Per-user voting power history |
| proposalSnapshots | mapping(uint256 => uint256) | Block numbers for proposal snapshots |
| totalSupplyCheckpoints | Checkpoint[] | Historical total supply data |

### Checkpoint
| Field | Type | Description |
|-------|------|-------------|
| timestamp | uint256 | Checkpoint creation timestamp |
| value | uint256 | Voting power value at checkpoint |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| CheckpointCreated | Emitted when checkpoint created | `user`: User address<br>`blockNumber`: Block number<br>`power`: Voting power |
| ProposalSnapshotSet | Emitted when proposal snapshot set | `proposalId`: Proposal ID<br>`blockNumber`: Snapshot block |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidBlockNumber | Block number query is invalid |
| PowerTooHigh | Power value exceeds maximum |
| InvalidProposalId | Proposal ID is invalid |

## Usage Notes

- All checkpoints are automatically compressed for gas efficiency
- Block numbers must be in the past for queries
- Power values must not exceed uint224 maximum
- Proposal IDs must be non-zero
- Historical queries support both direct power and total supply
- Snapshots provide deterministic power readings for proposals

## Dependencies

The library depends on:

- Checkpoints library for base checkpoint functionality
- Solidity version 0.8.19 or higher for overflow checks

## Security Considerations

- Power values are compressed - must be within uint224 range
- Block numbers are validated against current block
- Proposal IDs must be non-zero for snapshots
- Only authorized contracts should write checkpoints
- Historical data is immutable once written
- Compression maintains precision while saving gas
