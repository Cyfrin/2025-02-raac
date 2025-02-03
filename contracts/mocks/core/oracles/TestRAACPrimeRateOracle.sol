// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {RAACPrimeRateOracle} from "../../../core/oracles/RAACPrimeRateOracle.sol";

/**
 * @dev Exposes the internal `fulfillRequest` as a public function so our mock
 *      can call it during tests.
 */
contract TestRAACPrimeRateOracle is RAACPrimeRateOracle {
    constructor(
        address router,
        bytes32 _donId,
        address _lendingPool
    ) RAACPrimeRateOracle(router, _donId, _lendingPool) {}

    function publicFulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) public {
        fulfillRequest(requestId, response, err);
    }
}
