// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../core/collectors/FeeCollector.sol";

/**
 * @title Mock Fee Collector Contract
 * @notice Exposes internal functions for testing
 */
contract MockFeeCollector is FeeCollector {
    constructor(
        address _raacToken,
        address _veRAACToken,
        address _treasury,
        address _repairFund,
        address _admin
    ) FeeCollector(_raacToken, _veRAACToken, _treasury, _repairFund, _admin) {}
}