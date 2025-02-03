// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockContractWithConfig {
    mapping(bytes4 => bytes) public mockConfig;

    function mock(bytes4 functionSig, bytes memory returnData) external {
        mockConfig[functionSig] = returnData;
    }

    fallback() external {
        bytes4 functionSig = bytes4(msg.data);
        bytes memory returnData = mockConfig[functionSig];
        assembly {
            return(add(returnData, 0x20), mload(returnData))
        }
    }
}