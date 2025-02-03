// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {RAACHousePriceOracle} from "../../../core/oracles/RAACHousePriceOracle.sol";

/**
 * @dev Exposes the internal `fulfillRequest` as a public function so our mock
 *      can call it during tests.
 */
contract TestRAACHousePriceOracle is RAACHousePriceOracle {
    constructor(
        address router,
        bytes32 _donId,
        address housePricesAddress
    ) RAACHousePriceOracle(router, _donId, housePricesAddress) {}

    function publicFulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) public {
        fulfillRequest(requestId, response, err);
    }
}
