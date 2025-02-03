// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { TestRAACPrimeRateOracle } from "./TestRAACPrimeRateOracle.sol";

/**
 * @dev Mock contract that simulates the DON's callback.
 */
contract MockOracle {
    bytes32 public donId;

    constructor(bytes32 _donId) {
        donId = _donId;
    }

    /**
     * @dev Calls the `fulfillRequest` function on the given oracle contract.
        Call it in tests to simulate the oracle's callback.
     */
    function fulfillRequest(address oracleAddress, bytes32 requestId, bytes memory response, bytes memory error) public {
        TestRAACPrimeRateOracle(oracleAddress).publicFulfillRequest(requestId, response, error);
    }
}