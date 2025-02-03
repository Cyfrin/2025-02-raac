// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../primitives/MockContractWithConfig.sol";
import "../../../core/tokens/RAACToken.sol";

contract MockStabilityPool is MockContractWithConfig {
    RAACToken public raacToken;

    constructor(address _raacToken) {
        raacToken = RAACToken(_raacToken);
    }

    function getTotalDeposits() external view returns (uint256) {
        bytes4 functionSig = this.getTotalDeposits.selector;
        bytes memory returnData = mockConfig[functionSig];
        if (returnData.length == 0) {
            return 0; // Default return value if not mocked
        }
        return abi.decode(returnData, (uint256));
    }

    // Mock the getTotalDeposits function
    function mockGetTotalDeposits(uint256 returnValue) external {
        bytes4 functionSig = this.getTotalDeposits.selector;
        mockConfig[functionSig] = abi.encode(returnValue);
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(raacToken.transfer(recipient, amount), "Transfer failed");
        return true;
    }
}