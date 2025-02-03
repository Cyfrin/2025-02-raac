# Checkpoints

## Overview

The Checkpoints library provides functionality for tracking historical values with binary search lookups and storage compression. It implements chronological value tracking with optimized gas usage and data integrity checks.

## Purpose

- Track historical values with binary search capability
- Compress storage using uint224 for gas efficiency 
- Enable batch checkpoint operations
- Maintain chronological integrity of values
- Provide  historical value lookups
- Support value operations through function pointers

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| compress | Compresses uint256 to uint224 | Internal Pure | `value`: Value to compress | uint224: Compressed value |
| writeBatchCheckpoints | Writes multiple checkpoints | Internal | `self`: Checkpoint array<br>`op`: Operation function<br>`values`: Values to write | (uint32[], uint224[]): Block numbers and new values |
| writeCheckpoint | Writes single checkpoint | Internal | `self`: Checkpoint array<br>`op`: Operation function<br>`value`: Value to write | (uint32, uint224): Block number and new value |
| findCheckpoint | Finds value at block | Internal View | `self`: Checkpoint array<br>`blockNumber`: Block to query | uint256: Historical value |
| latestCheckpoint | Gets most recent value | Internal View | `self`: Checkpoint array | uint256: Latest value |
| checkpointCount | Gets number of checkpoints | Internal View | `self`: Checkpoint array | uint256: Count |

## Implementation Details

### Features:

- Data management using Checkpoint struct
- Event emission for state changes
- Binary search for historical lookups
- Storage compression for gas optimization
- Batch operations support
- Chronological validation
- Value operation support

## Data Structures

### Checkpoint
| Field | Type | Description |
|-------|------|-------------|
| fromBlock | uint32 | Block number of the checkpoint |
| value | uint224 | Compressed value at checkpoint |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| CheckpointWritten | Emitted when checkpoint written | `blockNumber`: Block number<br>`value`: Stored value |
| BatchCheckpointsWritten | Emitted for batch writes | `blockNumbers`: Block numbers array<br>`values`: Values array |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| ValueTooLarge | When value exceeds uint224 maximum |
| InvalidBlockOrder | When checkpoints not chronological |
| FutureBlockQuery | When querying future blocks |
| BatchArrayLengthMismatch | When batch arrays have different lengths |

## Usage Notes

- Values must fit within uint224 range
- Checkpoints must be chronologically ordered
- Future block queries not allowed
- Binary search used for historical lookups
- Zero returned for blocks before first checkpoint
- Latest value returned for blocks after last checkpoint
- Batch operations available for multiple updates
- Value operations supported through function pointers

## Dependencies

The library depends on:

- Solidity version 0.8.19 or higher for overflow checks
- No external library dependencies