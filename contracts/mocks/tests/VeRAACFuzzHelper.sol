// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../core/tokens/veRAACToken.sol";

contract VeRAACFuzzHelper {
    veRAACToken public veToken;
    
    struct LockScenario {
        uint256 amount;
        uint256 duration;
        uint256 timestamp;
    }

    struct BoostScenario {
        uint256 amount;
        uint256 lockAmount;
        uint256 totalSupply;
    }

    constructor(address _veToken) {
        veToken = veRAACToken(_veToken);
    }

    function generateLockScenario(
        uint256 seed
    ) external view returns (
        uint256 amount,
        uint256 duration
    ) {
        // Generate amount between 1 and 1M tokens
        amount = uint256(keccak256(abi.encodePacked(seed, "amount"))) % 1e24 + 1e18;
        
        // Generate duration between MIN_LOCK_DURATION and MAX_LOCK_DURATION
        duration = (uint256(keccak256(abi.encodePacked(seed, "duration"))) 
            % (1460 days - 365 days)) + 365 days;
        
        return (amount, duration);
    }

    function generateBoostScenario(
        uint256 seed
    ) external view returns (
        uint256 amount,
        uint256 lockAmount,
        uint256 totalSupply
    ) {
        amount = uint256(keccak256(abi.encodePacked(seed, "amount"))) % 1e24 + 1e18;
        lockAmount = uint256(keccak256(abi.encodePacked(seed, "lock"))) % 1e24 + 1e18;
        totalSupply = lockAmount + uint256(keccak256(abi.encodePacked(seed, "supply"))) % 1e24;
        
        return (amount, lockAmount, totalSupply);
    }
}
