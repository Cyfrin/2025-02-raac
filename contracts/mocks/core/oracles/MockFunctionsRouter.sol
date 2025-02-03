// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


interface IFunctionsRouter {
    /// @notice Sends a request using the provided subscriptionId
  /// @param subscriptionId - A unique subscription ID allocated by billing system,
  /// a client can make requests from different contracts referencing the same subscription
  /// @param data - CBOR encoded Chainlink Functions request data, use FunctionsClient API to encode a request
  /// @param dataVersion - Gas limit for the fulfillment callback
  /// @param callbackGasLimit - Gas limit for the fulfillment callback
  /// @param donId - An identifier used to determine which route to send the request along
  /// @return requestId - A unique request identifier
  function sendRequest(
    uint64 subscriptionId,
    bytes calldata data,
    uint16 dataVersion,
    uint32 callbackGasLimit,
    bytes32 donId
  ) external returns (bytes32);
}


/**
 * @notice A minimal mock of the Chainlink Functions Router,
 *         returning a fake requestId so that `_sendRequest` won't revert.
 */
contract MockFunctionsRouter is IFunctionsRouter {
    // We won't implement everything from IFunctionsRouter, just the bare minimum for tests.

    // -------------
    // IFunctionsRouter stubs
    // -------------

    // This is required by the client. We'll just stub it out.
    function getContractById(bytes32) external pure returns (address) {
        return address(0);
    }

    // The real router’s sendRequest function returns a bytes32 requestId.
    // We'll just generate some bytes32 so our contract sees a success.
    function sendRequest(
        uint64,       // subscriptionId
        bytes memory, // data
        uint16,       // dataVersion
        uint32,       // gasLimit
        bytes32       // donId
    ) external pure returns (bytes32) {
        // Return a dummy requestId
        bytes32 requestId = keccak256(abi.encode("dummy requestId"));
        return requestId;
    }

    // We won't bother implementing the rest for this minimal example.
}
