// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseChainlinkFunctionsOracle.sol";
import "../primitives/RAACHousePrices.sol";
import "../../libraries/utils/StringUtils.sol";

/**
 * @title RAACHousePriceOracle
 * @dev Contract for using oracles to fetch house pricing data from off-chain api
 * This contract allows an oracle to update prices.
 */
contract RAACHousePriceOracle is BaseChainlinkFunctionsOracle {
    using StringUtils for string;

    RAACHousePrices public housePrices;
    uint256 public lastHouseId;

    event HousePriceUpdated(uint256 indexed houseId, uint256 price);

    constructor(
        address router,
        bytes32 _donId,
        address housePricesAddress
    ) BaseChainlinkFunctionsOracle(router, _donId) {
        require(housePricesAddress != address(0), "HousePrices address must be set");
        housePrices = RAACHousePrices(housePricesAddress);
    }

    /**
     * @notice Hook called before fulfillment to store the house ID
     * @param args The arguments passed to sendRequest
     */
    function _beforeFulfill(string[] calldata args) internal override {
        lastHouseId = args[0].stringToUint();
    }

    /**
     * @notice Process the response from the oracle
     * @param response The response from the oracle
     */
    function _processResponse(bytes memory response) internal override {
        uint256 price = abi.decode(response, (uint256));
        housePrices.setHousePrice(lastHouseId, price);
        emit HousePriceUpdated(lastHouseId, price);
    }
}
