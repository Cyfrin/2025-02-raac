// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../mocks/libraries/governance/VotingPowerMock.sol";
import "../../libraries/governance/RAACVoting.sol";

// Add this interface at the top of the file
interface IVMTimeControl {
    function warp(uint256) external;
}

contract VotingPowerFuzzHelper {
    VotingPowerMock public votingPower;
    IVMTimeControl constant VM = IVMTimeControl(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    
    struct PowerScenario {
        uint256 amount;
        uint256 duration;
        uint256 timestamp;
        address user;
    }

    event ScenarioGenerated(
        address indexed user,
        uint256 amount,
        uint256 duration,
        uint256 timestamp
    );

    constructor(address _votingPower) {
        votingPower = VotingPowerMock(_votingPower);
    }

    function generatePowerScenario(
        uint256 seed
    ) external view returns (
        uint256 amount,
        uint256 duration,
        uint256 unlockTime
    ) {
        amount = uint256(keccak256(abi.encodePacked(seed, "amount"))) % 1e27;
        duration = (uint256(keccak256(abi.encodePacked(seed, "duration"))) 
            % (4 * 365 days)) + 7 days; // Between 7 days and 4 years
        unlockTime = block.timestamp + duration;
        
        return (amount, duration, unlockTime);
    }

    function simulatePowerDecay(
        address user,
        uint256 amount,
        uint256 duration,
        uint256 steps
    ) external returns (uint256[] memory powers) {
        require(steps > 0 && steps <= 52, "Invalid steps"); // Max 52 weeks

        uint256 unlockTime = block.timestamp + duration;
        votingPower.calculateAndUpdatePower(user, amount, unlockTime);
        
        powers = new uint256[](steps);
        uint256 stepDuration = duration / steps;
        
        for (uint256 i = 0; i < steps; i++) {
            // Use VM cheatcode to increase time
            VM.warp(block.timestamp + stepDuration);
            powers[i] = votingPower.getCurrentPower(user);
        }
        
        return powers;
    }
}
