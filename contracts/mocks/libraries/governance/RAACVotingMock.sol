// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/governance/RAACVoting.sol";

contract RAACVotingMock {
    using RAACVoting for *;

    error ZeroAmount();
    error InvalidUnlockTime();

    function calculateBias(
        uint256 amount,
        uint256 unlockTime,
        uint256 currentTime
    ) external pure returns (int128) {
        // if (amount == 0) revert ZeroAmount();
        // if (unlockTime <= currentTime) revert InvalidUnlockTime();
        return RAACVoting.calculateBias(amount, unlockTime, currentTime);
    }

    function calculateSlope(uint256 amount) external pure returns (int128) {
        // if (amount == 0) revert ZeroAmount();
        return RAACVoting.calculateSlope(amount);
    }
}
