// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseChainlinkFunctionsOracle.sol";
import "../../interfaces/core/pools/LendingPool/ILendingPool.sol";

/**
 * @title RAACPrimeRateOracle
 * @dev Contract for using oracles to fetch prime rate from off-chain api
 */
contract RAACPrimeRateOracle is BaseChainlinkFunctionsOracle {
    uint256 public lastPrimeRate;
    uint256 public lastUpdateTimestamp;
    ILendingPool public lendingPool;

    event PrimeRateUpdated(uint256 price);

    constructor(
        address router,
        bytes32 _donId,
        address _lendingPool
    ) BaseChainlinkFunctionsOracle(router, _donId) {
        lendingPool = ILendingPool(_lendingPool);
    }

    /**
     * @notice Hook called before fulfillment to handle any pre-processing
     * @param args The arguments passed to sendRequest
     */
    function _beforeFulfill(string[] calldata args) internal override {}

    /**
     * @notice Process the response from the oracle
     * @param response The response from the oracle
     */
    function _processResponse(bytes memory response) internal override {
        lastPrimeRate = abi.decode(response, (uint256));
        lastUpdateTimestamp = block.timestamp;
        lendingPool.setPrimeRate(lastPrimeRate);
        emit PrimeRateUpdated(lastPrimeRate);
    }

    /**
     * @notice Get the latest prime rate
     * @return The latest prime rate
     */
    function getPrimeRate() external view returns (uint256) {
        return lastPrimeRate;
    }
}
