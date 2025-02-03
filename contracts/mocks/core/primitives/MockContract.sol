// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockContract {
    uint256 public value;

    function setValue(uint256 newValue) external {
        value = newValue;
    }
}
