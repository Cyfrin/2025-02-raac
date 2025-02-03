// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockGaugeController {
    function getGaugeWeight(address) external pure returns (uint256) {
        return 1000;
    }

    function getTypeWeight(uint256) external pure returns (uint256) {
        return 1000;
    }
}
