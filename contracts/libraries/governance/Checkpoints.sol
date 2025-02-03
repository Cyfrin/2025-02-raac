// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Checkpoints Library
 * @author RAAC Protocol Team
 * @notice Library for handling historical value tracking with binary search
 * @dev Provides functionality for tracking historical values with efficient lookups
 * Key features:
 * - Binary search for historical values
 * - Storage compression using uint224
 * - Batch checkpoint writing
 * - Chronological validation
 */
 
library Checkpoints {
    /**
     * @notice Structure representing a single checkpoint
     * @dev Uses compressed storage for gas efficiency
     * @param fromBlock Block number where value was updated (uint32)
     * @param value The stored value (uint224)
     */
    struct Checkpoint {
        uint32 fromBlock;    // Block number of the checkpoint
        uint224 value;       // Compressed value at checkpoint
    }

    /**
     * @notice Emitted when a new checkpoint is written
     * @param blockNumber The block number of the checkpoint
     * @param value The value stored in the checkpoint
     */
    event CheckpointWritten(uint32 indexed blockNumber, uint224 value);

    /**
     * @notice Emitted when multiple checkpoints are written in batch
     * @param blockNumbers Array of block numbers
     * @param values Array of corresponding values
     */
    event BatchCheckpointsWritten(uint32[] blockNumbers, uint224[] values);

    /**
     * @notice Thrown when value exceeds uint224 maximum
     */
    error ValueTooLarge();

    /**
     * @notice Thrown when checkpoint blocks are not in chronological order
     */
    error InvalidBlockOrder();

    /**
     * @notice Thrown when querying future blocks
     */
    error FutureBlockQuery();

    /**
     * @notice Thrown when batch checkpoint arrays have mismatched lengths
     */
    error BatchArrayLengthMismatch();

    /**
     * @notice Compresses a uint256 into uint224 with overflow checking
     * @dev Reverts if value exceeds uint224 maximum
     * @param value The value to compress
     * @return compressed The compressed uint224 value
     */
    function compress(uint256 value) internal pure returns (uint224 compressed) {
        if (value > type(uint224).max) revert ValueTooLarge();
        return uint224(value);
    }

    /**
     * @notice Writes multiple checkpoints in a single transaction
     * @dev Applies operation to each value and maintains chronological order
     * Emits BatchCheckpointsWritten event after all checkpoints are written
     * @param self The checkpoint array to operate on
     * @param op Operation to perform on old and new values
     * @param values Array of values to write checkpoints for
     * @return blockNumbers Array of block numbers for each checkpoint
     * @return newValues Array of new values after applying operations
     */
    function writeBatchCheckpoints(
        Checkpoint[] storage self,
        function(uint256, uint256) view returns (uint256) op,
        uint256[] memory values
    ) internal returns (uint32[] memory blockNumbers, uint224[] memory newValues) {
        uint256 length = values.length;
        if (length == 0) return (new uint32[](0), new uint224[](0));

        blockNumbers = new uint32[](length);
        newValues = new uint224[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (blockNumbers[i], newValues[i]) = writeCheckpoint(self, op, values[i]);
        }
        
        emit BatchCheckpointsWritten(blockNumbers, newValues);
        return (blockNumbers, newValues);
    }

    /**
     * @notice Writes a checkpoint for a value at the current block
     * @dev Updates existing checkpoint if same block, otherwise creates new one
     * Maintains chronological order and applies operation to values
     * @param self The checkpoint array to operate on
     * @param op Operation to perform on old and new values
     * @param value New value to write
     * @return blockNumber The block number the checkpoint was written at
     * @return newValue The new value after applying the operation
     */
    function writeCheckpoint(
        Checkpoint[] storage self,
        function(uint256, uint256) view returns (uint256) op,
        uint256 value
    ) internal returns (uint32 blockNumber, uint224 newValue) {
        uint256 pos = self.length;
        blockNumber = uint32(block.number);

        if (pos > 0) {
            Checkpoint storage last = self[pos - 1];
            
            if (last.fromBlock == blockNumber) {
                newValue = compress(op(last.value, value));
                self[pos - 1].value = newValue;
                emit CheckpointWritten(blockNumber, newValue);
                return (blockNumber, newValue);
            }

            if (last.fromBlock > blockNumber) revert InvalidBlockOrder();
            newValue = compress(op(last.value, value));
        } else {
            newValue = compress(value);
        }

        self.push(Checkpoint({fromBlock: blockNumber, value: newValue}));
        emit CheckpointWritten(blockNumber, newValue);
        return (blockNumber, newValue);
    }

    /**
     * @notice Finds a checkpoint value at a given block using binary search
     * @dev Optimized binary search implementation for historical lookups
     * Returns 0 for blocks before first checkpoint
     * Returns latest value for blocks after last checkpoint
     * @param self The checkpoint array to search
     * @param blockNumber The block number to look up
     * @return The value at the given block
     */
    function findCheckpoint(
        Checkpoint[] storage self,
        uint256 blockNumber
    ) internal view returns (uint256) {
        if (blockNumber >= block.number) revert FutureBlockQuery();

        uint256 len = self.length;
        if (len == 0) return 0;
        
        if (blockNumber < self[0].fromBlock) return 0;
        if (blockNumber >= self[len - 1].fromBlock) {
            return self[len - 1].value;
        }

        uint256 low = 0;
        uint256 high = len - 1;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (self[mid].fromBlock <= blockNumber) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return self[low].value;
    }

    /**
     * @notice Returns the latest checkpoint value
     * @dev Returns 0 if no checkpoints exist
     * @param self The checkpoint array to read from
     * @return The most recent checkpoint value
     */
    function latestCheckpoint(
        Checkpoint[] storage self
    ) internal view returns (uint256) {
        uint256 len = self.length;
        return len == 0 ? 0 : self[len - 1].value;
    }

    /**
     * @notice Returns the number of checkpoints in the array
     * @param self The checkpoint array to count
     * @return The number of checkpoints
     */
    function checkpointCount(
        Checkpoint[] storage self
    ) internal view returns (uint256) {
        return self.length;
    }
}