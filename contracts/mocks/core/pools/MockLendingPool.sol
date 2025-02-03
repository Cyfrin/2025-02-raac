// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../primitives/MockContractWithConfig.sol";
import "../../../interfaces/core/tokens/IRToken.sol";

contract MockLendingPool is MockContractWithConfig {
    IRToken public rToken;

    function setRToken(address _rToken) external {
        rToken = IRToken(_rToken);
    }

    function getNormalizedDebt() external view returns (uint256) {
        bytes4 functionSig = this.getNormalizedDebt.selector;
        bytes memory returnData = mockConfig[functionSig];
        if (returnData.length == 0) {
            return 0; // Default return value if not mocked
        }
        return abi.decode(returnData, (uint256));
    }

    function getNormalizedIncome() external view returns (uint256) {
        bytes4 functionSig = this.getNormalizedIncome.selector;
        bytes memory returnData = mockConfig[functionSig];
        if (returnData.length == 0) {
            return 1e27; // Default return value (RAY) if not mocked
        }
        return abi.decode(returnData, (uint256));
    }

    function mockMint(address caller, address onBehalfOf, uint256 amount, uint256 index) external returns (bool, uint256, uint256, uint256) {
        return rToken.mint(caller, onBehalfOf, amount, index);
    }

    function mockGetNormalizedDebt(uint256 returnValue) external {
        bytes4 functionSig = this.getNormalizedDebt.selector;
        mockConfig[functionSig] = abi.encode(returnValue);
    }

    function mockGetNormalizedIncome(uint256 returnValue) external {
        bytes4 functionSig = this.getNormalizedIncome.selector;
        mockConfig[functionSig] = abi.encode(returnValue);
    }

    function mockBurn(address from, address receiverOfUnderlying, uint256 amount, uint256 index) external returns (uint256, uint256, uint256) {
        return rToken.burn(from, receiverOfUnderlying, amount, index);
    }

    function transferAccruedDust(address recipient, uint256 amount) external {
        rToken.transferAccruedDust(recipient, amount);
    }
}